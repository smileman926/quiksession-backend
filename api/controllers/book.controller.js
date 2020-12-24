const httpStatus = require("http-status");
const Book = require("../models/book.model");
const Charge = require("../models/charge.model");
const Studio = require("../models/studio.model");
const User = require("../models/user.model");
const Subscriber = require("../models/subscriber.model");
const Mongoose = require("mongoose");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

/**
 * Load book from bookId and append to req.
 * @public
 */
exports.load = async (req, res, next, id) => {
  try {
    const book = await Book.find({ _id: id });
    req.locals = { book };
    return next();
  } catch (error) {
    return next(error);
  }
};

/**
 * Get book
 * @public
 */
exports.get = (req, res) => res.json(req.locals.book.transform());

/**
 * Get book list
 * @public
 */
exports.list = async (req, res, next) => {
  try {
    let books = await Book.list({ ...req.query });
    if (req.query.TaskId && req.query.date) {
      let task = await Studio.find({
        room: {
          $elemMatch: { _id: Mongoose.Types.ObjectId(req.query.TaskId) },
        },
      });
      if (task.length == 0) {
        return res.json({ ATimes: [], ProjectId: 0, TaskId: 0 });
      }
      var pdate = new Date(req.query.date);
      var edate = new Date(req.query.date);
      var interval = 60;
      edate.setDate(edate.getDate() + 1);
      var ava_arr = Array.apply(null, { length: (24 * 60) / interval }).map(
        function () {
          return 1;
        }
      );
      var ava_books = books.filter((book) => {
        return book.BookStatus == "Unavailable";
      });
      var n_books = books.filter((book) => {
        return book.BookStatus != "Unavailable";
      });
      var f_processBook = function (book, type) {
        var s_date = book.StartTime > pdate ? book.StartTime : pdate;
        var e_date = book.EndTime < edate ? book.EndTime : edate;
        var sind = (s_date - pdate) / (1000 * 60 * interval);
        var eind = (e_date - pdate) / (1000 * 60 * interval);
        for (var i = sind; i < eind; i++) {
          ava_arr[i] = type;
        }
      };
      ava_books.map((book) => f_processBook(book, 0));
      n_books.map((book) => f_processBook(book, 0));
      var t_arr = [];
      var isNew = -1;
      ava_arr.push(0);
      for (var i = 0; i < ava_arr.length; i++) {
        if (ava_arr[i] == 1 && isNew == -1) {
          isNew = i;
        }
        if (ava_arr[i] == 0 && isNew != -1) {
          var nsd = new Date(pdate.getTime() + isNew * 1000 * 60 * interval);
          var ned = new Date(pdate.getTime() + i * 1000 * 60 * interval);
          t_arr.push({ StartTime: nsd, EndTime: ned });
          isNew = -1;
        }
      }
      return res.json({
        ATimes: t_arr,
        AArray: ava_arr,
        ProjectId: task[0]._id,
        TaskId: req.query.TaskId,
      });
    } else {
      var jbooks = JSON.parse(JSON.stringify(books));
      jbooks.map((book) => {
        book.isChangable = true;
      });
      jbooks.map((ava_book) => {
        if (ava_book.BookStatus != "Unavailable") ava_book.isChangable = false;
        if (ava_book.BookStatus == "Pending") ava_book.isChangable = true;
      });
      return res.json(jbooks);
    }
  } catch (error) {
    console.log(error);
    return res.send({ error });
  }
};
/**
 * Create new book
 * @public
 */
exports.create = async (req, res, next) => {
  try {
    const book = new Book(req.body);
    book.BookStatus =
      req.body.EventType == "Charge" ? "Pending" : "Unavailable";
    if (req.projectId) book.projectId = req.projectId;
    if (req.body.chargeId && req.body.chargeId.length == 24) {
      var cg = await Charge.findById(req.body.chargeId);
      var artist = await User.findOne({ email: cg.ArtistEmail });
      book.ArtistId = artist._id;
      cg.BookId = book._id;
      await cg.save();
    }
    book.Id = 1;
    const savedBook = await book.save();
    res.status(httpStatus.CREATED);
    res.json(savedBook.transform());
  } catch (error) {
    next(error);
  }
};

exports.createBooked = async (req, res, next) => {
  try {
    let artist = await User.findById(req.body.ArtistId);
    if (artist.credit < req.body.Credits) {
      throw new APIError({
        message: "Artist Credits is too low",
      });
      return;
    }
    var book = new Book(req.body);
    console.log(req.body);
    book.BookStatus = "Booked";
    book.Id = 1;
    book.ArtistId = req.body.ArtistId;

    let studio = await Studio.findById(book.ProjectId);
    let owner = await User.findById(String(studio.owner));
    let subscribers = await Subscriber.list();
    let playerIds = [];
    await subscribers.forEach((subscriber) => {
      if (String(subscriber.owner.id) === String(owner._id)) {
        playerIds.push(subscriber.playerId);
      }
    });
    var acd = null;
    if (owner.stripeId) {
      acd = await stripe.accounts.retrieveCapability(
        owner.stripeId,
        "transfers"
      );
    }
    if (acd && acd.status == "active") {
      const transfer = await stripe.transfers.create({
        amount: req.body.Credits * 100,
        currency: "usd",
        destination: owner.stripeId,
      });
    } else {
      owner.credit += req.body.Credits;
    }

    artist.credit -= req.body.Credits * 1.15;

    var sendNotification = function (data) {
      var headers = {
        "Content-Type": "application/json; charset=utf-8",
      };

      var options = {
        host: "onesignal.com",
        port: 443,
        path: "/api/v1/notifications",
        method: "POST",
        headers: headers,
      };

      var https = require("https");
      var req = https.request(options, function (res) {
        res.on("data", function (data) {
          console.log("Response:");
          console.log(JSON.parse(data));
        });
      });

      req.on("error", function (e) {
        console.log("ERROR:");
        console.log(e);
      });

      req.write(JSON.stringify(data));
      req.end();
    };
    console.log("playerIds", playerIds);
    var message = {
      app_id: process.env.NOTIFICATION_ID,
      headings: { en: "QuikSession upcoming booking" },
      contents: { en: `${book.Subject}` },
      include_player_ids: playerIds,
    };
    sendNotification(message);

    await book.save();
    await owner.save();
    await artist.save();
    res.json(book.transform());
  } catch (error) {
    console.log(error);
    next(error);
  }
};

/**
 * Delete book
 * @public
 */
exports.remove = (req, res, next) => {
  const { book } = req.locals;
  book[0]
    .remove()
    .then(() => res.status(httpStatus.NO_CONTENT).end())
    .catch((e) => next(e));
};

/**
 * Update existing book
 * @public
 */
exports.update = (req, res, next) => {
  const bookData = req.body;
  const book = Object.assign(req.locals.book[0], bookData);

  book
    .save()
    .then((savedBook) => res.json(savedBook.transform()))
    .catch((e) => {
      next(e);
      console.log(e);
    });
};

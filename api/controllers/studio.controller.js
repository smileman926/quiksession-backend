const httpStatus = require("http-status");
const path = require("path");
const Studio = require("../models/studio.model");

/**
 * Load studio from studioId and append to req.
 * @public
 */
exports.load = async (req, res, next, id) => {
  try {
    const studio = await Studio.get(id);
    req.locals = { studio };
    return next();
  } catch (error) {
    return next(error);
  }
};

/**
 * Get studio
 * @public
 */
exports.get = (req, res) => res.json(req.locals.studio.transform());

/**
 * Get studio list
 * @public
 */
exports.list = async (req, res, next) => {
  try {
    let studios = await Studio.list({ ...req.query });
    return res.json(studios);
  } catch (error) {
    return res.send({ error });
  }
};

/**
 * Create new studio
 * @public
 */
exports.create = async (req, res) => {
  try {
    req.body.service = JSON.parse(req.body.service);
    req.body.equip = JSON.parse(req.body.equip);
    req.body.engineer = JSON.parse(req.body.engineer);
    req.body.room = JSON.parse(req.body.room);
    const loc = JSON.parse(req.body.location);
    req.body.location = {
      type: "point",
      coordinates: [loc.lng, loc.lat]
    };
    const studio = new Studio(req.body);

    if (req.files) {
      let file = [];
      let count = 0;
      if (req.files.photo) {
        file[count] = req.files.photo;
        studio.photo = file[count].name;
        count++;
      }
      if (req.files.room) {
        for (let i = 0; i < req.files.room.length; i++) {
          file[count] = req.files.room[i];
          count++;
        }
      }
      for (let i = 0; i < count; i++) {
        const filePath = path.join(
          __dirname,
          `../../client/public/uploads/${file[i].name}`
        );
        file[i].mv(filePath, (err) => {
          if (err) {
            console.error(err);
          }
        });
      }
    } else {
      studio.photo = "default.jpg";
    }
    studio.owner = req.user;
    const savedStudio = await studio.save();
    return res.json(savedStudio.transform());
  } catch (error) {
    return res.send({ error });
  }
};

/**
 * Update existing studio
 * @public
 */
exports.update = async (req, res) => {
  req.body.service = JSON.parse(req.body.service);
  req.body.equip = JSON.parse(req.body.equip);
  req.body.engineer = JSON.parse(req.body.engineer);
  req.body.room = JSON.parse(req.body.room);
  req.body.location = JSON.parse(req.body.location);
  const studioData = req.body;
  if (req.files) {
    let file = [];
    let count = 0;
    if (req.files.photo) {
      file[count] = req.files.photo;
      studioData.photo = file[count].name;
      count++;
    }
    if (req.files.room) {
      for (let i = 0; i < req.files.room.length; i++) {
        file[count] = req.files.room[i];
        count++;
      }
    }
    for (let i = 0; i < count; i++) {
      const filePath = path.join(
        __dirname,
        `../../client/public/uploads/${file[i].name}`
      );
      file[i].mv(filePath, (err) => {
        if (err) {
          console.error(err);
        }
      });
    }
  }
  const studio = Object.assign(req.locals.studio, studioData);

  await studio
    .save()
    .then((savedStudio) => {
      return res.json(savedStudio.transform());
    })
    .catch((error) => {
      return res.send({ error });
    });
};

/**
 * Delete studio
 * @public
 */
exports.remove = (req, res, next) => {
  const { studio } = req.locals;
  console.log("studio", studio);
  studio
    .remove()
    .then(() => res.status(httpStatus.NO_CONTENT).end())
    .catch((e) => next(e));
};

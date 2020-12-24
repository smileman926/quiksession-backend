const Subscriber = require("../models/subscriber.model");
/**
 * Create new subscriber
 * @public
 */
exports.create = async (req, res) => {
  try {
    const subscriber = new Subscriber(req.body);
    // console.log("subscriber", subscriber);
    subscriber.owner = req.body.userId;
    const savedSubscriber = await subscriber.save();

    return res.json(savedSubscriber.transform());
  } catch (error) {
    return res.send({ error });
  }
};

/**
 * Get subscriber lists
 * @public
 */
exports.list = async (req, res) => {
  try {
    let subscribers = await Subscriber.list();
    return res.json(subscribers);
  } catch (error) {
    return res.send({ error });
  }
};

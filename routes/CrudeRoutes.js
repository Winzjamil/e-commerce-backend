import express from 'express';
import { createActivity } from '../controllers/controller.js';
export const crudePretectedRoutes = ({
  model,
  basePath = '/',
  middleWare = {},
  activity = {},
}) => {
  const router = express.Router();
  const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);
  const { create = [], update = [], getAll = [], remove = [] } = middleWare;
  const {
    create: createActivityAction,
    update: updateActivityAction,
    remove: removeActivityAction,
  } = activity;
  router.get(
    basePath,
    ...getAll,
    wrap(async (req, res) => {
      let doc = await model.find({ owner: req.user.id });
      if (!doc)
        return res
          .status(404)
          .json({ message: `${model.modelName} not found` });

      res.status(200).json({
        message: `${model.modelName} fetched successfully`,
        data: doc,
      });
    })
  );

  router.post(
    basePath,
    ...create,
    wrap(async (req, res) => {
      const docData = { ...req.body };
      if (req.user && model.schema.path('owner')) {
        docData.owner = req.user.id;
      }
      const newDoc = new model(docData);
      const savedDoc = await newDoc.save();

      if (req.user && createActivityAction) {
        const itemName = savedDoc.name || savedDoc.title || savedDoc._id;
        createActivity({
          owner: req.user.id,
          email: req.user.email,
          action: createActivityAction,
          details: ` Added "${itemName}" to ${model.modelName}`,
        });
      }
      res.status(201).json({
        message: `${model.modelName} created successfully`,
        data: savedDoc,
      });
    })
  );

  router.delete(
    `${basePath}:id`,
    ...remove,
    wrap(async (req, res) => {
      const docs = await model.findOneAndDelete({
        _id: req.params.id,
        owner: req.user.id,
      });

      if (!docs) {
        return res
          .status(404)
          .json({ message: `${model.modelName} not found` });
      }
      res.status(200).json({
        message: `${model.modelName} fetched successfully`,
        data: docs,
      });
      if (req.user && removeActivityAction) {
        const itemName = docs.name || docs.title || docs._id;
        createActivity({
          owner: req.user.id,
          action: removeActivityAction,
          email: req.user.email,
          details: ` Remove "${itemName}"from${model.modelName} `,
        });
      }
    })
  );

  router.patch(
    `${basePath}:id`,
    ...update,
    wrap(async (req, res) => {
      const updatedDoc = await model.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true }
      );

      if (!updatedDoc)
        return res
          .status(404)
          .json({ message: `${model.modelName} not found` });
      res.status(200).json({
        message: `${model.modelName} updated successfully`,
        data: updatedDoc,
      });
      if (req.user && updateActivityAction) {
        const itemName = updatedDoc.name || updatedDoc.title || updatedDoc._id;
        createActivity({
          owner: req.user.id,
          email: req.user.email,
          action: updateActivityAction,
          details: ` Updet "${itemName}" on ${model.modelName} `,
        });
      }
    })
  );

  return router;
};

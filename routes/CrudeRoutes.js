import express from 'express';
export const crudePretectedRoutes = ({
  model,
  basePath = '/',
  middleWare = {},
}) => {
  const router = express.Router();
  const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);
  const {
    create = [],
    update = [],
    getById = [],
    getAll = [],
    remove = [],
  } = middleWare;

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
    })
  );

  return router;
};

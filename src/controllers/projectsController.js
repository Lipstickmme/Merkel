'use strict';

const projects = require('../data/projects.json');

exports.list = (req, res) => {
  const { sector } = req.query;
  let result = projects;
  if (sector) {
    result = projects.filter((p) => p.sector.toLowerCase() === String(sector).toLowerCase());
  }
  res.json({ count: result.length, projects: result });
};

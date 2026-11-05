const { z } = require("zod");
const genres = require("../../shared/genres.json");
const preferredgenresschema = z.array(z.enum(genres)).min(1, "choose at least one favourite genre")
  .transform(values => [...new Set(values)]);
module.exports = { preferredgenresschema };

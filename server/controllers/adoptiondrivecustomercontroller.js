const { errorstatus } = require("../utils/errors");
const adoptiondrivemodel = require("../models/adoptiondrives");

function getdriveflash(msg) {
  const flashmap = {
    success: {
      type: "success",
      text: "rsvp successful!"
    },
    empty: {
      type: "error",
      text: "please select at least one drive to rsvp"
    },
    unrsvp: {
      type: "success",
      text: "you have successfully cancelled your rsvp."
    },
    already: {
      type: "error",
      text: "you have already rsvped to one or more selected drives."
    },
    closed: {
      type: "error",
      text: "rsvp closed — this drive is full."
    },
    cancelled: {
      type: "error",
      text: "sorry this adoption drive has been cancelled."
    },
    default: {
      type: "error",
      text: "could not rsvp. please try again."
    }
  };

  return flashmap[msg] || flashmap.default;
}

const getcustomeralldrives = async (req, res) => {
  try {
    const drives = await adoptiondrivemodel.getalldrives();
    const msg = req.query.msg || null;

    if (msg) {
      const currentflash = getdriveflash(msg);
      if (currentflash.type === "error") {
        return res.status(400).json({ error: currentflash.text });
      }
      return res.json({ message: currentflash.text });
    }

    return res.json({
      drives
    });
  } catch (error) {
    console.log(error);
    return res.status(errorstatus(error)).json({ error: "error loading adoption drives" });
  }
};

module.exports = { getcustomeralldrives };

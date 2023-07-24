"use strict";

const db = require("../db");
const ExpressError = require("../expressError");

async function checkForUser(userId) {
    const userCheck = await db.query("SELECT * FROM users WHERE id = $1", [
        userId,
    ]);
    if (userCheck.rows.length === 0) return { message: "User not found" };
}

function checkUserIdMatchesLoggedInUser(userId, loggedInUserId) {
    if (loggedInUserId != userId) {
        throw new ExpressError("Incorrect User ID", 403);
    }
}

module.exports = { checkForUser, checkUserIdMatchesLoggedInUser };

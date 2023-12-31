"use strict";

const express = require("express");
const router = new express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/users/user");
const { SECRET_KEY } = require("../config");
const jsonschema = require("jsonschema");
const registerSchema = require("../schemas/register.json");
const ExpressError = require("../expressError");

router.post("/register", async function registerUser(req, res, next) {
    try {
        const { username, fname, lname, email, password } = req.body;
        if (!username || !password) {
            throw new ExpressError("Username and Password Required", 400);
        }
        const validator = jsonschema.validate(req.body, registerSchema);
        if (!validator.valid) {
            const listOfErrors = validator.errors.map((e) => e.stack);
            const errors = new ExpressError(listOfErrors, 400);
            return next(errors);
        }
        const hashedPw = await bcrypt.hash(password, 12);
        const user = await User.create(username, fname, lname, email, hashedPw);
        const { id } = user;
        const payload = { username: username, id: id };
        const token = jwt.sign(payload, SECRET_KEY);
        return res.status(201).json({ token });
    } catch (error) {
        if (error.code === "23505") {
            return next(
                new ExpressError("Username taken. Please pick another.", 400)
            );
        }
        return next(error);
    }
});

router.post("/login", async function loginUser(req, res, next) {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            throw new ExpressError("Username and password required", 400);
        }
        const user = await User.getByUsernameForLogin(username);
        const { id } = user;
        const payload = { username: username, id: id };
        if (await bcrypt.compare(password, user.password)) {
            const token = jwt.sign(payload, SECRET_KEY);
            return res.json({
                message: "Successfully logged in!",
                token,
            });
        }
        throw new ExpressError("Invalid username/password", 400);
    } catch (error) {
        return next(error);
    }
});

module.exports = router;

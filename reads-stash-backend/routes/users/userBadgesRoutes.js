"use strict";

const express = require("express");
const router = new express.Router();
const db = require("../../db");

router.get("/", function getAllUserBadges(req, res, next) {
    try {
        return res
            .status(200)
            .json({ msg: "Mock get all user's badges request" });
    } catch (error) {
        return next(error);
    }
});

router.get("/:badge_id", function getOneUserBadge(req, res, next) {
    try {
        return res.status(200).json({ msg: "Mock get one user badge request" });
    } catch (error) {
        return next(error);
    }
});

router.post("/", async function createUserBadge(req, res, next) {
    try {
        const { user_id, badge_id } = req.body;
        const results = await db.query(
            "INSERT INTO users_badges (user_id, badge_id) VALUES ($1, $2) RETURNING * ;",
            [user_id, badge_id]
        );
        return res.status(201).json(results.rows);
    } catch (error) {
        return next(error);
    }
});

router.delete("/:badge_id", function deleteUserBadge(req, res, next) {
    try {
        return res.status(200).json({ msg: "Mock delete user badge request" });
    } catch (error) {
        return next(error);
    }
});

module.exports = router;

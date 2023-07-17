"use strict";

const express = require("express");
const router = new express.Router();
const db = require("../../db");
const UserBadge = require("../../models/users/badge");
const { ensureLoggedIn } = require("../../middleware/auth");

router.get(
    "/:userId/badges",
    ensureLoggedIn,
    async function getAllUserBadges(req, res, next) {
        try {
            const { userId } = req.params;
            const userBadges = await UserBadge.getAll(userId);
            return res.status(200).json(userBadges);
        } catch (error) {
            return next(error);
        }
    }
);

router.get(
    "/:userId/badges/:badgeId",
    ensureLoggedIn,
    async function getOneUserBadge(req, res, next) {
        try {
            const { userId, badgeId } = req.params;
            const userBadge = await UserBadge.getById(userId, badgeId);
            return res.status(200).json(userBadge);
        } catch (error) {
            return next(error);
        }
    }
);

router.post(
    "/:userId/badges",
    ensureLoggedIn,
    async function createUserBadge(req, res, next) {
        try {
            const { userId, badgeId } = req.body;
            const badge = await UserBadge.create(userId, badgeId);
            return res.status(201).json(badge);
        } catch (error) {
            return next(error);
        }
    }
);

router.delete(
    "/:userId/badges/:userBadgeId",
    ensureLoggedIn,
    async function deleteUserBadge(req, res, next) {
        try {
            const { userId, userBadgeId } = req.params;
            const userBadge = await UserBadge.getById(userId, userBadgeId);
            await userBadge.delete(userId);
            return res
                .status(200)
                .json({ msg: `Deleted user's badge ${userBadgeId}` });
        } catch (error) {
            return next(error);
        }
    }
);

module.exports = router;

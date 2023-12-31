"use strict";

process.env.NODE_ENV = "test";

const request = require("supertest");

const app = require("../../app");
const db = require("../../db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { SECRET_KEY } = require("../../config");

let testUserToken;

let test1Username, test2Username, test3Username;

beforeAll(async () => {
    await db.query("DELETE FROM users;");

    const hashedPassword = await bcrypt.hash("secret", 1);
    const res = await db.query(
        `INSERT INTO users (username, fname, lname, email, password) VALUES ('test1', 'tfn', 'tln', 'test@email.com', $1), ('test2', 'tfn', 'tln', 'test@email.com', $1), ('test3', 'tfn', 'tln', 'test@email.com', $1) RETURNING username, id`,
        [hashedPassword]
    );

    const testUser = { username: res.rows[0].username, id: res.rows[0].id };

    test1Username = res.rows[0].username;
    test2Username = res.rows[1].username;
    test3Username = res.rows[2].username;

    await db.query(
        `INSERT INTO users_followers (user_username, follower_username) VALUES ($1, $2), ($1, $3), ($2, $3)`,
        [test1Username, test2Username, test3Username]
    );

    testUserToken = jwt.sign(testUser, SECRET_KEY);
});

afterAll(async () => {
    await db.query("DELETE FROM users;");
    await db.end();
});

describe("GET /api/users/:username/followers", () => {
    test("get all user followers and 200 status code with valid token and current user username. Should not get other user's followers.", async () => {
        const res = await request(app)
            .get(`/api/users/${test1Username}/followers`)
            .set({ _token: testUserToken });
        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual([
            {
                email: "test@email.com",
                exp: null,
                fname: "tfn",
                followerUsername: test2Username,
                lname: "tln",
                totalBooks: null,
                totalPages: null,
                username: test1Username,
            },
            {
                email: "test@email.com",
                exp: null,
                fname: "tfn",
                followerUsername: test3Username,
                lname: "tln",
                totalBooks: null,
                totalPages: null,
                username: test1Username,
            },
        ]);
    });

    test("get error message and 401 status code if no token sent and current user username", async () => {
        const res = await request(app).get(
            `/api/users/${test1Username}/followers`
        );
        expect(res.statusCode).toBe(401);
        expect(res.body).toEqual({
            error: { message: "Unauthorized", status: 401 },
        });
    });

    test("get error message and 401 status code if bad token sent and current user username", async () => {
        const res = await request(app)
            .get(`/api/users/${test1Username}/followers`)
            .set({ _token: "bad token" });
        expect(res.statusCode).toBe(401);
        expect(res.body).toEqual({
            error: { message: "Unauthorized", status: 401 },
        });
    });

    test("get error message and 403 status code if valid token sent and other user's username", async () => {
        const res = await request(app)
            .get(`/api/users/${test2Username}/followers`)
            .set({ _token: testUserToken });
        expect(res.statusCode).toBe(403);
        expect(res.body).toEqual({
            error: {
                message: "Cannot View Other User's Followers",
                status: 403,
            },
        });
    });
});

describe("GET /api/users/:username/followers/:followerUsername", () => {
    test("get one user follower and 200 status code with valid token, valid user username and valid user followed username", async () => {
        const res = await request(app)
            .get(`/api/users/${test1Username}/followers/${test2Username}`)
            .set({ _token: testUserToken });
        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual({
            email: "test@email.com",
            exp: null,
            fname: "tfn",
            followerUsername: test2Username,
            lname: "tln",
            totalBooks: null,
            totalPages: null,
            username: test1Username,
        });
    });

    test("get error message and 401 status code with no token, a valid user username and valid follower username", async () => {
        const res = await request(app).get(
            `/api/users/${test1Username}/followers/${test2Username}`
        );
        expect(res.statusCode).toBe(401);
        expect(res.body).toEqual({
            error: { message: "Unauthorized", status: 401 },
        });
    });

    test("get error message and 401 status code with bad token, a valid user username and valid follower username", async () => {
        const res = await request(app)
            .get(`/api/users/${test1Username}/followers/${test2Username}`)
            .set({ _token: "bad token" });
        expect(res.statusCode).toBe(401);
        expect(res.body).toEqual({
            error: { message: "Unauthorized", status: 401 },
        });
    });

    test("get error message and 403 status code with valid token, invalid user username and valid follower username", async () => {
        const res = await request(app)
            .get(`/api/users/${test2Username}/followers/${test3Username}`)
            .set({ _token: testUserToken });
        expect(res.statusCode).toBe(403);
        expect(res.body).toEqual({
            error: {
                message: "Cannot View Other Users Followers",
                status: 403,
            },
        });
    });

    test("get error message and 403 status code with valid token, incorrect user username  and valid follower username", async () => {
        const res = await request(app)
            .get(`/api/users/incorrect/followers/${test1Username}`)
            .set({ _token: testUserToken });
        expect(res.statusCode).toBe(403);
        expect(res.body).toEqual({
            error: {
                message: "Cannot View Other Users Followers",
                status: 403,
            },
        });
    });
});

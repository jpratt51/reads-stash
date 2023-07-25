"use strict";

process.env.NODE_ENV = "test";

const request = require("supertest");

const app = require("../../app");
const db = require("../../db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { SECRET_KEY } = require("../../config");

let testUserToken;

let testUserId, test2UserId, collectionId1, collectionId3;

beforeAll(async () => {
    await db.query("DELETE FROM users;");

    const hashedPassword = await bcrypt.hash("secret", 1);
    const res = await db.query(
        `INSERT INTO users (username, fname, lname, email, password) VALUES ('test1', 'tfn', 'tln', 'test@email.com', $1), ('test2', 'tfn', 'tln', 'test@email.com', $1) RETURNING username, id`,
        [hashedPassword]
    );

    const testUser = { username: res.rows[0].username, id: res.rows[0].id };
    testUserToken = jwt.sign(testUser, SECRET_KEY);

    testUserId = res.rows[0].id;
    test2UserId = res.rows[1].id;

    const collectionIds = await db.query(
        `INSERT INTO collections (name, user_id) VALUES ('test collection name 1', $1), ('test collection name 2', $1), ('test collection name 3', $2) RETURNING id`,
        [testUserId, test2UserId]
    );

    collectionId1 = collectionIds.rows[0].id;
    collectionId3 = collectionIds.rows[2].id;
});

afterAll(async () => {
    await db.query("DELETE FROM users;");
    await db.end();
});

describe("GET /api/users/:userId/collections", () => {
    test("get all user collections and 200 status code with valid token and current user id. Should not get other user's collections.", async () => {
        const res = await request(app)
            .get(`/api/users/${testUserId}/collections`)
            .set({ _token: testUserToken });
        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual([
            {
                id: expect.any(Number),
                name: "test collection name 1",
                userId: testUserId,
            },
            {
                id: expect.any(Number),
                name: "test collection name 2",
                userId: testUserId,
            },
        ]);
    });

    test("get error message and 401 status code if no token sent and current user id", async () => {
        const res = await request(app).get(
            `/api/users/${testUserId}/collections`
        );
        expect(res.statusCode).toBe(401);
        expect(res.body).toEqual({
            error: { message: "Unauthorized", status: 401 },
        });
    });

    test("get error message and 401 status code if bad token sent and current user id", async () => {
        const res = await request(app)
            .get(`/api/users/${testUserId}/collections`)
            .set({ _token: "bad token" });
        expect(res.statusCode).toBe(401);
        expect(res.body).toEqual({
            error: { message: "Unauthorized", status: 401 },
        });
    });

    test("get error message and 403 status code if valid token sent and other user's id", async () => {
        const res = await request(app)
            .get(`/api/users/${test2UserId}/collections`)
            .set({ _token: testUserToken });
        expect(res.statusCode).toBe(403);
        expect(res.body).toEqual({
            error: {
                message: "Incorrect User ID",
                status: 403,
            },
        });
    });
});

describe("GET /api/users/:userId/collections/:collectionId", () => {
    test("get one user collection and 200 status code with valid token, valid user id and valid user collection id", async () => {
        const res = await request(app)
            .get(`/api/users/${testUserId}/collections/${collectionId1}`)
            .set({ _token: testUserToken });
        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual({
            id: expect.any(Number),
            name: "test collection name 1",
            userId: testUserId,
        });
    });

    test("get error message and 401 status code with no token, a valid user id and valid collection id", async () => {
        const res = await request(app).get(
            `/api/users/${testUserId}/collections/${collectionId1}`
        );
        expect(res.statusCode).toBe(401);
        expect(res.body).toEqual({
            error: { message: "Unauthorized", status: 401 },
        });
    });

    test("get error message and 401 status code with bad token, a valid user id and valid collection id", async () => {
        const res = await request(app)
            .get(`/api/users/${testUserId}/collections/${collectionId1}`)
            .set({ _token: "bad token" });
        expect(res.statusCode).toBe(401);
        expect(res.body).toEqual({
            error: { message: "Unauthorized", status: 401 },
        });
    });

    test("get error message and 403 status code with valid token, invalid user id and valid collection id", async () => {
        const res = await request(app)
            .get(`/api/users/${test2UserId}/collections/${collectionId3}`)
            .set({ _token: testUserToken });
        expect(res.statusCode).toBe(403);
        expect(res.body).toEqual({
            error: {
                message: "Incorrect User ID",
                status: 403,
            },
        });
    });

    test("get error message and 403 status code with valid token, invalid userId parameter type and valid collection id", async () => {
        const res = await request(app)
            .get(`/api/users/bad_type/collections/${collectionId1}`)
            .set({ _token: testUserToken });
        expect(res.statusCode).toBe(403);
        expect(res.body).toEqual({
            error: {
                message: "Incorrect User ID",
                status: 403,
            },
        });
    });
});

describe("POST /api/users/:userId/collections", () => {
    test("get error message and 401 status code when sending in invalid token, valid userId and valid user collection inputs", async () => {
        const res = await request(app)
            .post(`/api/users/${testUserId}/collections`)
            .set({ _token: "bad token" })
            .send({
                name: "test collection insertion",
                userId: testUserId,
            });
        expect(res.statusCode).toBe(401);
        expect(res.body).toEqual({
            error: { message: "Unauthorized", status: 401 },
        });
    });

    test("get error message and 403 status code when sending in valid token, invalid userId and valid collection inputs", async () => {
        const res = await request(app)
            .post(`/api/users/1000/collections`)
            .set({ _token: testUserToken })
            .send({
                name: "test collection insertion",
                userId: testUserId,
            });
        expect(res.statusCode).toBe(403);
        expect(res.body).toEqual({
            error: {
                message: "Incorrect User ID",
                status: 403,
            },
        });
    });

    test("get error message and 403 status code when sending in valid token, invalid user id data type and valid collection inputs", async () => {
        const res = await request(app)
            .post(`/api/users/bad_type/collections`)
            .set({ _token: testUserToken })
            .send({
                name: "test collection insertion",
                userId: testUserId,
            });
        expect(res.statusCode).toBe(403);
        expect(res.body).toEqual({
            error: {
                message: "Incorrect User ID",
                status: 403,
            },
        });
    });

    test("get error message and 400 status code when sending in valid token, valid userId and invalid collection inputs", async () => {
        const res = await request(app)
            .post(`/api/users/${testUserId}/collections`)
            .set({ _token: testUserToken })
            .send({
                name: 12345,
                userId: testUserId,
            });
        expect(res.statusCode).toBe(400);
        expect(res.body).toEqual({
            error: {
                message: ["instance.name is not of a type(s) string"],
                status: 400,
            },
        });
    });

    test("get created user collection object and 201 status code when sending in valid token, valid userId and valid user collection inputs", async () => {
        const res = await request(app)
            .post(`/api/users/${testUserId}/collections`)
            .set({ _token: testUserToken })
            .send({
                name: "test collection insertion",
                userId: testUserId,
            });
        expect(res.statusCode).toBe(201);
        expect(res.body).toEqual({
            id: expect.any(Number),
            name: "test collection insertion",
            userId: testUserId,
        });
    });
});

describe("PATCH /api/users/:userId/collections/:collectionId", () => {
    test("get error message and 401 status code when sending in invalid token, valid user id and valid update collection inputs", async () => {
        const res = await request(app)
            .patch(`/api/users/${testUserId}/collections/${collectionId1}`)
            .set({ _token: "bad token" })
            .send({
                name: "test collection insertion",
            });
        expect(res.statusCode).toBe(401);
        expect(res.body).toEqual({
            error: { message: "Unauthorized", status: 401 },
        });
    });

    test("get error message and 403 status code when sending in valid token, invalid user id and valid update collection inputs", async () => {
        const res = await request(app)
            .patch(`/api/users/1000/collections/${collectionId1}`)
            .set({ _token: testUserToken })
            .send({
                name: "test collection insertion",
            });
        expect(res.statusCode).toBe(403);
        expect(res.body).toEqual({
            error: { message: "Incorrect User ID", status: 403 },
        });
    });

    test("get error message and 403 status code when sending in valid token, invalid user id data type and valid update collection inputs", async () => {
        const res = await request(app)
            .patch(`/api/users/bad_type/collections/${collectionId1}`)
            .set({ _token: testUserToken })
            .send({
                name: "test collection insertion",
            });
        expect(res.statusCode).toBe(403);
        expect(res.body).toEqual({
            error: { message: "Incorrect User ID", status: 403 },
        });
    });

    test("get error message and 400 status code when sending in valid token, valid user id and invalid update collection inputs", async () => {
        const res = await request(app)
            .patch(`/api/users/${testUserId}/collections/${collectionId1}`)
            .set({ _token: testUserToken })
            .send({
                name: true,
            });
        expect(res.statusCode).toBe(400);
        expect(res.body).toEqual({
            error: {
                message: ["instance.name is not of a type(s) string"],
                status: 400,
            },
        });
    });

    test("get updated user collection object and 200 status code when sending in valid token, valid user id and valid user collection inputs", async () => {
        const res = await request(app)
            .patch(`/api/users/${testUserId}/collections/${collectionId1}`)
            .set({ _token: testUserToken })
            .send({
                name: "test collection insertion",
            });
        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual({
            id: expect.any(Number),
            name: "test collection insertion",
            userId: testUserId,
        });
    });
});

describe("DELETE /api/users/:userId/collections/:collectionId", () => {
    test("get error message and 403 status code if valid token, other user's id and valid collection id", async () => {
        const res = await request(app)
            .delete(`/api/users/${test2UserId}/collections/${collectionId1}`)
            .set({ _token: testUserToken });
        expect(res.statusCode).toBe(403);
        expect(res.body).toEqual({
            error: { message: "Incorrect User ID", status: 403 },
        });
    });

    test("get error message and 401 status code if invalid token, valid user id and valid collection id", async () => {
        const res = await request(app)
            .delete(`/api/users/${testUserId}/collections/${collectionId1}`)
            .set({ _token: "bad token" });
        expect(res.statusCode).toBe(401);
        expect(res.body).toEqual({
            error: { message: "Unauthorized", status: 401 },
        });
    });

    test("get error message and 403 status code if valid token, bad data type user id and valid collection id", async () => {
        const res = await request(app)
            .delete(`/api/users/bad_type/collections/${collectionId1}`)
            .set({ _token: testUserToken });
        expect(res.statusCode).toBe(403);
        expect(res.body).toEqual({
            error: { message: "Incorrect User ID", status: 403 },
        });
    });

    test("get deleted user collection message and 200 status code if valid token, valid user id and valid collection id", async () => {
        const res = await request(app)
            .delete(`/api/users/${testUserId}/collections/${collectionId1}`)
            .set({ _token: testUserToken });
        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual({
            msg: `Deleted User Collection ${collectionId1}`,
        });
    });
});

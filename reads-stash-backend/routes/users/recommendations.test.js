"use strict";

process.env.NODE_ENV = "test";

const request = require("supertest");

const app = require("../../app");
const db = require("../../db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { SECRET_KEY } = require("../../config");

let testUserToken;

let testUserId, test2UserId, test3UserId;
let recId1, recId2, recId3;

beforeAll(async () => {
    await db.query("DELETE FROM users;");

    const hashedPassword = await bcrypt.hash("secret", 1);
    const res = await db.query(
        `INSERT INTO users (username, fname, lname, email, password) VALUES ('test1', 'tfn', 'tln', 'test@email.com', $1), ('test2', 'tfn', 'tln', 'test@email.com', $1), ('test3', 'tfn', 'tln', 'test@email.com', $1) RETURNING username, id`,
        [hashedPassword]
    );

    const testUser = { username: res.rows[0].username, id: res.rows[0].id };

    testUserId = res.rows[0].id;
    test2UserId = res.rows[1].id;
    test3UserId = res.rows[2].id;

    const recIds = await db.query(
        `INSERT INTO recommendations (recommendation, receiver_id, sender_id) VALUES ('recommendation from test1 to test2', $1, $2), ('recommendation from test2 to test1', $2, $1), ('recommendation from test2 to test3', $3, $1) RETURNING id`,
        [test2UserId, testUserId, test3UserId]
    );

    recId1 = recIds.rows[0].id;
    recId2 = recIds.rows[1].id;
    recId3 = recIds.rows[2].id;

    testUserToken = jwt.sign(testUser, SECRET_KEY);
});

afterAll(async () => {
    await db.query("DELETE FROM users;");
    await db.end();
});

describe("GET /api/users/:userId/recommendations", () => {
    test("get all user recommendations and 200 status code with valid token and current user id. Should not get recommendation where neither the sender or receiver id matches the current user's id.", async () => {
        const res = await request(app)
            .get(`/api/users/${testUserId}/recommendations`)
            .set({ _token: testUserToken });
        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual([
            {
                id: expect.any(Number),
                receiverId: test2UserId,
                recommendation: "recommendation from test1 to test2",
                senderId: testUserId,
            },
            {
                id: expect.any(Number),
                receiverId: testUserId,
                recommendation: "recommendation from test2 to test1",
                senderId: test2UserId,
            },
        ]);
    });

    test("get error message and 401 status code if no token sent and current user id", async () => {
        const res = await request(app).get(
            `/api/users/${testUserId}/recommendations`
        );
        expect(res.statusCode).toBe(401);
        expect(res.body).toEqual({
            error: { message: "Unauthorized", status: 401 },
        });
    });

    test("get error message and 401 status code if bad token sent and current user id", async () => {
        const res = await request(app)
            .get(`/api/users/${testUserId}/recommendations`)
            .set({ _token: "bad token" });
        expect(res.statusCode).toBe(401);
        expect(res.body).toEqual({
            error: { message: "Unauthorized", status: 401 },
        });
    });

    test("get error message and 403 status code if valid token sent and other user's id", async () => {
        const res = await request(app)
            .get(`/api/users/${test2UserId}/recommendations`)
            .set({ _token: testUserToken });
        expect(res.statusCode).toBe(403);
        expect(res.body).toEqual({
            error: {
                message: "Cannot View Other User's Recommendations",
                status: 403,
            },
        });
    });
});

describe("GET /api/users/:userId/recommendations/:recommendationId", () => {
    test("get one user recommendation and 200 status code with valid token, valid user id and valid user recommendation id", async () => {
        const res = await request(app)
            .get(`/api/users/${testUserId}/recommendations/${recId1}`)
            .set({ _token: testUserToken });
        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual({
            id: expect.any(Number),
            receiverId: test2UserId,
            recommendation: "recommendation from test1 to test2",
            senderId: testUserId,
        });
    });

    // test("get error message and 401 status code with no token and valid user id", async () => {
    //     const res = await request(app).get(`/api/users/${testUserId}`);
    //     expect(res.statusCode).toBe(401);
    //     expect(res.body).toEqual({
    //         error: { message: "Unauthorized", status: 401 },
    //     });
    // });

    // test("get error message and 401 status code with bad token and valid user id", async () => {
    //     const res = await request(app)
    //         .get(`/api/users/${testUserId}`)
    //         .set({ _token: "bad token" });
    //     expect(res.statusCode).toBe(401);
    //     expect(res.body).toEqual({
    //         error: { message: "Unauthorized", status: 401 },
    //     });
    // });

    // test("get error message and 404 status code with valid token and invalid user id", async () => {
    //     const res = await request(app)
    //         .get(`/api/users/1000`)
    //         .set({ _token: testUserToken });
    //     expect(res.statusCode).toBe(404);
    //     expect(res.body).toEqual({
    //         error: { message: "User 1000 not found", status: 404 },
    //     });
    // });

    // test("get error message and 400 status code with valid token and invalid userId parameter type", async () => {
    //     const res = await request(app)
    //         .get(`/api/users/badType`)
    //         .set({ _token: testUserToken });
    //     expect(res.statusCode).toBe(400);
    //     expect(res.body).toEqual({
    //         error: { message: "Invalid user id data type", status: 400 },
    //     });
    // });
});

// describe("PATCH /api/users/:userId", () => {
//     test("get updated user object and 200 status code when sending in valid token, valid userId and valid update user inputs", async () => {
//         const res = await request(app)
//             .patch(`/api/users/${testUserId}`)
//             .set({ _token: testUserToken })
//             .send({ username: "updatedUsername", fname: "updatedFname" });
//         expect(res.statusCode).toBe(200);
//         expect(res.body).toEqual({
//             email: "test@email.com",
//             exp: null,
//             fname: "updatedFname",
//             id: expect.any(Number),
//             lname: "tln",
//             totalBooks: null,
//             totalPages: null,
//             username: "updatedUsername",
//         });
//     });

//     test("get error message and 401 status code when sending in valid user id, invalid token and valid update user inputs", async () => {
//         const res = await request(app)
//             .patch(`/api/users/${testUserId}`)
//             .set({ _token: "bad token" })
//             .send({ lname: "updatedLname" });
//         expect(res.statusCode).toBe(401);
//         expect(res.body).toEqual({
//             error: { message: "Unauthorized", status: 401 },
//         });
//     });

//     test("get error message and 403 status code when sending in invalid user id, valid token and valid update user inputs", async () => {
//         const res = await request(app)
//             .patch(`/api/users/1000`)
//             .set({ _token: testUserToken })
//             .send({ lname: "updatedLname" });
//         expect(res.statusCode).toBe(403);
//         expect(res.body).toEqual({
//             error: { message: "Cannot Update Other Users", status: 403 },
//         });
//     });

//     test("get error message and 403 status code when sending in invalid user id data type, valid token and valid update user inputs", async () => {
//         const res = await request(app)
//             .patch(`/api/users/bad_type`)
//             .set({ _token: testUserToken })
//             .send({ lname: "updatedLname" });
//         expect(res.statusCode).toBe(403);
//         expect(res.body).toEqual({
//             error: { message: "Cannot Update Other Users", status: 403 },
//         });
//     });

//     test("get error message and 400 status code when sending in valid user id, valid token and invalid update user inputs", async () => {
//         const res = await request(app)
//             .patch(`/api/users/${testUserId}`)
//             .set({ _token: testUserToken })
//             .send({ username: "lol" });
//         expect(res.statusCode).toBe(400);
//         expect(res.body).toEqual({
//             error: {
//                 message: [
//                     "instance.username does not meet minimum length of 5",
//                 ],
//                 status: 400,
//             },
//         });
//     });
// });

// describe("DELETE /api/users", () => {
//     test("get error message and 403 status code if valid token and other user's id", async () => {
//         const res = await request(app)
//             .delete(`/api/users/${test2UserId}`)
//             .set({ _token: testUserToken });
//         expect(res.statusCode).toBe(403);
//         expect(res.body).toEqual({
//             error: { message: "Cannot Delete Other Users", status: 403 },
//         });
//     });

//     test("get error message and 401 status code if invalid token and current user's id", async () => {
//         const res = await request(app)
//             .delete(`/api/users/${testUserId}`)
//             .set({ _token: "bad token" });
//         expect(res.statusCode).toBe(401);
//         expect(res.body).toEqual({
//             error: { message: "Unauthorized", status: 401 },
//         });
//     });

//     test("get error message and 403 status code if valid token and bad data type user id", async () => {
//         const res = await request(app)
//             .delete(`/api/users/bad_type`)
//             .set({ _token: testUserToken });
//         expect(res.statusCode).toBe(403);
//         expect(res.body).toEqual({
//             error: { message: "Cannot Delete Other Users", status: 403 },
//         });
//     });

//     test("get deleted user message and 200 status code if valid token and valid user id", async () => {
//         const res = await request(app)
//             .delete(`/api/users/${testUserId}`)
//             .set({ _token: testUserToken });
//         expect(res.statusCode).toBe(200);
//         expect(res.body).toEqual({ msg: expect.stringContaining("Deleted") });
//     });
// });

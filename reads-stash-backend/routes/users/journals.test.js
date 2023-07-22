"use strict";

process.env.NODE_ENV = "test";

const request = require("supertest");

const app = require("../../app");
const db = require("../../db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { SECRET_KEY } = require("../../config");

let testUserToken;

let testUserId, test2UserId, journalId1, journalId2, journalId3;

beforeAll(async () => {
    await db.query("DELETE FROM users;");

    const hashedPassword = await bcrypt.hash("secret", 1);
    const res = await db.query(
        `INSERT INTO users (username, fname, lname, email, password) VALUES ('test1', 'tfn', 'tln', 'test@email.com', $1), ('test2', 'tfn', 'tln', 'test@email.com', $1) RETURNING username, id`,
        [hashedPassword]
    );

    const testUser = { username: res.rows[0].username, id: res.rows[0].id };

    testUserId = res.rows[0].id;
    test2UserId = res.rows[1].id;

    const journalIds = await db.query(
        `INSERT INTO journals (title, date, text, user_id) VALUES ('test journal title', '2023-07-21', 'test journal text', $1), ('test2 journal title', '2023-07-21', 'test2 journal text', $1), ('test journal title 2', '2023-07-21', 'test journal text', $2) RETURNING id`,
        [testUserId, test2UserId]
    );

    journalId1 = journalIds.rows[0].id;
    journalId2 = journalIds.rows[1].id;
    journalId3 = journalIds.rows[2].id;

    testUserToken = jwt.sign(testUser, SECRET_KEY);
});

afterAll(async () => {
    await db.query("DELETE FROM users;");
    await db.end();
});

describe("GET /api/users/:userId/journals", () => {
    test("get all user journals and 200 status code with valid token and current user id. Should not get other user's journals.", async () => {
        const res = await request(app)
            .get(`/api/users/${testUserId}/journals`)
            .set({ _token: testUserToken });
        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual([
            {
                date: "2023-07-21T05:00:00.000Z",
                id: journalId1,
                text: "test journal text",
                title: "test journal title",
                userId: testUserId,
            },
            {
                date: "2023-07-21T05:00:00.000Z",
                id: journalId2,
                text: "test2 journal text",
                title: "test2 journal title",
                userId: testUserId,
            },
        ]);
    });

    test("get error message and 401 status code if no token sent and current user id", async () => {
        const res = await request(app).get(`/api/users/${testUserId}/journals`);
        expect(res.statusCode).toBe(401);
        expect(res.body).toEqual({
            error: { message: "Unauthorized", status: 401 },
        });
    });

    test("get error message and 401 status code if bad token sent and current user id", async () => {
        const res = await request(app)
            .get(`/api/users/${testUserId}/journals`)
            .set({ _token: "bad token" });
        expect(res.statusCode).toBe(401);
        expect(res.body).toEqual({
            error: { message: "Unauthorized", status: 401 },
        });
    });

    test("get error message and 403 status code if valid token sent and other user's id", async () => {
        const res = await request(app)
            .get(`/api/users/${test2UserId}/journals`)
            .set({ _token: testUserToken });
        expect(res.statusCode).toBe(403);
        expect(res.body).toEqual({
            error: {
                message: "Cannot View Other Users Journals",
                status: 403,
            },
        });
    });
});

describe("GET /api/users/:userId/journals/:journalId", () => {
    test("get one user journal and 200 status code with valid token, valid user id and valid user journal id", async () => {
        const res = await request(app)
            .get(`/api/users/${testUserId}/journals/${journalId1}`)
            .set({ _token: testUserToken });
        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual({
            date: "2023-07-21T05:00:00.000Z",
            id: journalId1,
            text: "test journal text",
            title: "test journal title",
            userId: testUserId,
        });
    });

    test("get error message and 401 status code with no token, a valid user id and valid journal id", async () => {
        const res = await request(app).get(
            `/api/users/${testUserId}/journals/${journalId1}`
        );
        expect(res.statusCode).toBe(401);
        expect(res.body).toEqual({
            error: { message: "Unauthorized", status: 401 },
        });
    });

    test("get error message and 401 status code with bad token, a valid user id and valid journal id", async () => {
        const res = await request(app)
            .get(`/api/users/${testUserId}/journals/${journalId1}`)
            .set({ _token: "bad token" });
        expect(res.statusCode).toBe(401);
        expect(res.body).toEqual({
            error: { message: "Unauthorized", status: 401 },
        });
    });

    test("get error message and 403 status code with valid token, invalid user id and valid journal id", async () => {
        const res = await request(app)
            .get(`/api/users/${test2UserId}/journals/${journalId3}`)
            .set({ _token: testUserToken });
        expect(res.statusCode).toBe(403);
        expect(res.body).toEqual({
            error: {
                message: "Cannot View Other User's Journals",
                status: 403,
            },
        });
    });

    test("get error message and 403 status code with valid token, invalid userId parameter type and valid journal id", async () => {
        const res = await request(app)
            .get(`/api/users/bad_type/journals/${journalId1}`)
            .set({ _token: testUserToken });
        expect(res.statusCode).toBe(403);
        expect(res.body).toEqual({
            error: {
                message: "Cannot View Other User's Journals",
                status: 403,
            },
        });
    });
});

describe("POST /api/users/:userId/journals", () => {
    test("get created user journal object and 201 status code when sending in valid token, valid userId and valid user journal inputs", async () => {
        const res = await request(app)
            .post(`/api/users/${testUserId}/journals`)
            .set({ _token: testUserToken })
            .send({
                title: "new journal title",
                date: "2023-07-17",
                text: "new journal text",
            });
        expect(res.statusCode).toBe(201);
        expect(res.body).toEqual({
            date: "2023-07-22T05:00:00.000Z",
            id: expect.any(Number),
            text: "new journal text",
            title: "new journal title",
            userId: testUserId,
        });
    });

    test("get error message and 401 status code when sending in invalid token, valid userId and valid user recommendation", async () => {
        const res = await request(app)
            .post(`/api/users/${testUserId}/journals`)
            .set({ _token: "bad token" })
            .send({
                title: "new journal title 2?",
                date: "2023-07-18",
                text: "new journal text 2?",
            });
        expect(res.statusCode).toBe(401);
        expect(res.body).toEqual({
            error: { message: "Unauthorized", status: 401 },
        });
    });

    test("get error message and 403 status code when sending in valid token, invalid userId and valid journal inputs", async () => {
        const res = await request(app)
            .post(`/api/users/1000/journals`)
            .set({ _token: testUserToken })
            .send({
                title: "new journal title 2?",
                date: "2023-07-18",
                text: "new journal text 2?",
            });
        expect(res.statusCode).toBe(403);
        expect(res.body).toEqual({
            error: {
                message: "Cannot Create Journals For Other Users",
                status: 403,
            },
        });
    });

    test("get error message and 403 status code when sending in valid token, invalid userId data type and valid journal inputs", async () => {
        const res = await request(app)
            .post(`/api/users/bad_type/journals`)
            .set({ _token: testUserToken })
            .send({
                title: "new journal title 2?",
                date: "2023-07-18",
                text: "new journal text 2?",
            });
        expect(res.statusCode).toBe(403);
        expect(res.body).toEqual({
            error: {
                message: "Cannot Create Journals For Other Users",
                status: 403,
            },
        });
    });

    test("get error message and 400 status code when sending in valid token, valid userId and invalid journal inputs", async () => {
        const res = await request(app)
            .post(`/api/users/${testUserId}/journals`)
            .set({ _token: testUserToken })
            .send({ badInput: "nope" });
        expect(res.statusCode).toBe(400);
        expect(res.body).toEqual({
            error: {
                message: [
                    'instance requires property "title"',
                    'instance requires property "text"',
                ],
                status: 400,
            },
        });
    });
});

// describe("PATCH /api/users/:userId/recommendations/:recommendationId", () => {
//     test("get updated user recommendation object and 200 status code when sending in valid token, valid userId, valid recommendation id and valid user recommendation input", async () => {
//         const res = await request(app)
//             .patch(`/api/users/${testUserId}/recommendations/${recId1}`)
//             .set({ _token: testUserToken })
//             .send({ recommendation: "updated recommendation" });
//         expect(res.statusCode).toBe(200);
//         expect(res.body).toEqual({
//             id: expect.any(Number),
//             receiverId: test2UserId,
//             recommendation: "updated recommendation",
//             senderId: testUserId,
//         });
//     });

//     test("get error message and 401 status code when sending in invalid token, valid user id, valid recommendation id and valid update recommendation input", async () => {
//         const res = await request(app)
//             .patch(`/api/users/${testUserId}/recommendations/${recId1}`)
//             .set({ _token: "bad token" })
//             .send({ recommendation: "update recommendation?" });
//         expect(res.statusCode).toBe(401);
//         expect(res.body).toEqual({
//             error: { message: "Unauthorized", status: 401 },
//         });
//     });

//     test("get error message and 403 status code when sending in valid token, invalid user id, valid recommendation id and valid update recommendation input", async () => {
//         const res = await request(app)
//             .patch(`/api/users/1000/recommendations/${recId1}`)
//             .set({ _token: testUserToken })
//             .send({ recommendation: "update recommendation?" });
//         expect(res.statusCode).toBe(403);
//         expect(res.body).toEqual({
//             error: {
//                 message: "Cannot Update Recommendations From Other Users",
//                 status: 403,
//             },
//         });
//     });

//     test("get error message and 403 status code when sending in valid token, invalid user id data type, valid recommendation id and valid update recommendation input", async () => {
//         const res = await request(app)
//             .patch(`/api/users/bad_type/recommendations/${recId1}`)
//             .set({ _token: testUserToken })
//             .send({ recommendation: "update recommendation?" });
//         expect(res.statusCode).toBe(403);
//         expect(res.body).toEqual({
//             error: {
//                 message: "Cannot Update Recommendations From Other Users",
//                 status: 403,
//             },
//         });
//     });

//     test("get error message and 400 status code when sending in valid token, valid user id, valid recommendation id and invalid update recommendation input", async () => {
//         const res = await request(app)
//             .patch(`/api/users/${testUserId}/recommendations/${recId1}`)
//             .set({ _token: testUserToken })
//             .send({ recommendation: 12345 });
//         expect(res.statusCode).toBe(400);
//         expect(res.body).toEqual({
//             error: {
//                 message: ["instance.recommendation is not of a type(s) string"],
//                 status: 400,
//             },
//         });
//     });
// });

// describe("DELETE /api/users/:userId/recommendations/:recommendationId", () => {
//     test("get error message and 403 status code if valid token, other user's id and valid recommendation id", async () => {
//         const res = await request(app)
//             .delete(`/api/users/${test2UserId}/recommendations/${recId1}`)
//             .set({ _token: testUserToken });
//         expect(res.statusCode).toBe(403);
//         expect(res.body).toEqual({
//             error: {
//                 message: "Invalid User ID",
//                 status: 403,
//             },
//         });
//     });

//     test("get error message and 401 status code if invalid token, valid user id and valid recommendation id", async () => {
//         const res = await request(app)
//             .delete(`/api/users/${testUserId}/recommendations/${recId1}`)
//             .set({ _token: "bad token" });
//         expect(res.statusCode).toBe(401);
//         expect(res.body).toEqual({
//             error: { message: "Unauthorized", status: 401 },
//         });
//     });

//     test("get error message and 403 status code if valid token, bad data type user id and valid recommendation id", async () => {
//         const res = await request(app)
//             .delete(`/api/users/bad_type/recommendations/${recId1}`)
//             .set({ _token: testUserToken });
//         expect(res.statusCode).toBe(403);
//         expect(res.body).toEqual({
//             error: { message: "Invalid User ID", status: 403 },
//         });
//     });

//     test("get deleted user recommendation message and 200 status code if valid token, valid user id and valid recommendation id", async () => {
//         const res = await request(app)
//             .delete(`/api/users/${testUserId}/recommendations/${recId1}`)
//             .set({ _token: testUserToken });
//         expect(res.statusCode).toBe(200);
//         expect(res.body).toEqual({ msg: expect.stringContaining("Deleted") });
//     });
// });

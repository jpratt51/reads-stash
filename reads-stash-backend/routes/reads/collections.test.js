"use strict";

process.env.NODE_ENV = "test";

const request = require("supertest");

const app = require("../../app");
const db = require("../../db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { SECRET_KEY } = require("../../config");

let testUserToken;

let testUserId,
    test2UserId,
    read1,
    read2,
    read3,
    read4,
    read5,
    user1collection1,
    user1collection2,
    user1collection3,
    user2collection1,
    user2collection2;

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

    const reads = await db.query(
        `INSERT INTO reads (title, isbn, description, avg_rating, print_type, publisher) VALUES 
        ('t1read', 1234567891011, 'test 1 book description', 3.5, 'BOOK', 'Penguin' ),
        ('t2read', 1234567891012, 'test 2 book description', 4, 'BOOK', 'Penguin' ),
        ('t3read', 1234567891013, 'test 3 book description', 4.5, 'BOOK', 'Penguin' ),
        ('t4read', 1234567891014, 'test 4 book description', 5, 'BOOK', 'Penguin' ),
        ('t5read', 1234567891015, 'test 5 book description', 2.5, 'BOOK', 'Penguin' ) RETURNING id;`
    );

    read1 = reads.rows[0].id;
    read2 = reads.rows[1].id;
    read3 = reads.rows[2].id;
    read4 = reads.rows[3].id;
    read5 = reads.rows[4].id;

    const collections = await db.query(
        `INSERT INTO collections (name, user_id) VALUES 
        ('t1ucollection', $1),
        ('t2ucollection', $1),
        ('t3ucollection', $1),
        ('t4ucollection', $2),
        ('t5ucollection', $2)
        RETURNING id`,
        [testUserId, test2UserId]
    );

    user1collection1 = collections.rows[0].id;
    user1collection2 = collections.rows[1].id;
    user1collection3 = collections.rows[2].id;
    user2collection1 = collections.rows[3].id;
    user2collection2 = collections.rows[4].id;

    await db.query(
        `INSERT INTO reads_collections (read_id, collection_id) VALUES
        ($1,$6),
        ($2,$7),
        ($3,$8),
        ($1,$7),
        ($4,$9),
        ($5,$10),
        ($1,$9),
        ($2,$10);`,
        [
            read1,
            read2,
            read3,
            read4,
            read5,
            user1collection1,
            user1collection2,
            user1collection3,
            user2collection1,
            user2collection2,
        ]
    );

    await db.query(
        `INSERT INTO users_reads (rating, review_text, review_date, user_id, read_id) VALUES
        (4, 'test 1 review text', '2023-07-22', $1, $3),
        (2, 'test 2 review text', '2023-07-22', $1, $4),
        (3, 'test 3 review text', '2023-07-22', $1, $5),
        (4, 'test 4 review text', '2023-07-22', $2, $6),
        (5, 'test 5 review text', '2023-07-22', $2, $7);`,
        [testUserId, test2UserId, read1, read2, read3, read4, read5]
    );
});

afterAll(async () => {
    await db.query("DELETE FROM users;");
    await db.end();
});

describe("GET /api/reads/:readId/collections", () => {
    test("get all user's read collections and 200 status code with valid token, current user id and valid read id. Should not get read collections of other users.", async () => {
        const res = await request(app)
            .get(`/api/reads/${read1}/collections`)
            .set({ _token: testUserToken })
            .send({ userId: testUserId });
        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual([
            {
                avgRating: null,
                collectionId: user1collection1,
                collectionName: "t1ucollection",
                description: null,
                id: expect.any(Number),
                isbn: null,
                printType: null,
                publisher: null,
                rating: null,
                reviewDate: null,
                reviewText: null,
                title: null,
            },
            {
                avgRating: null,
                collectionId: user1collection2,
                collectionName: "t2ucollection",
                description: null,
                id: expect.any(Number),
                isbn: null,
                printType: null,
                publisher: null,
                rating: null,
                reviewDate: null,
                reviewText: null,
                title: null,
            },
        ]);
    });

    test("get error message and 401 status code if no token sent and current user id", async () => {
        const res = await request(app)
            .get(`/api/reads/${read1}/collections`)
            .send({ userId: testUserId });
        expect(res.statusCode).toBe(401);
        expect(res.body).toEqual({
            error: { message: "Unauthorized", status: 401 },
        });
    });

    test("get error message and 401 status code if bad token sent and current user id", async () => {
        const res = await request(app)
            .get(`/api/reads/${read1}/collections`)
            .set({ _token: "bad token" })
            .send({ userId: testUserId });
        expect(res.statusCode).toBe(401);
        expect(res.body).toEqual({
            error: { message: "Unauthorized", status: 401 },
        });
    });

    test("get error message and 403 status code if valid token sent and other user's id", async () => {
        const res = await request(app)
            .get(`/api/reads/${read1}/collections`)
            .set({ _token: testUserToken })
            .send({ userId: test2UserId });
        expect(res.statusCode).toBe(403);
        expect(res.body).toEqual({
            error: {
                message: "Incorrect User ID",
                status: 403,
            },
        });
    });
});

// describe("GET /api/users/:userId/followers/:followedId", () => {
//     test("get one user followed and 200 status code with valid token, valid user id and valid user followed id", async () => {
//         const res = await request(app)
//             .get(`/api/users/${testUserId}/followed/${test2UserId}`)
//             .set({ _token: testUserToken });
//         expect(res.statusCode).toBe(200);
//         expect(res.body).toEqual({
//             email: "test@email.com",
//             exp: null,
//             fname: "tfn",
//             followedId: test2UserId,
//             lname: "tln",
//             totalBooks: null,
//             totalPages: null,
//             userId: testUserId,
//         });
//     });

//     test("get error message and 401 status code with no token, a valid user id and valid followed id", async () => {
//         const res = await request(app).get(
//             `/api/users/${testUserId}/followed/${test2UserId}`
//         );
//         expect(res.statusCode).toBe(401);
//         expect(res.body).toEqual({
//             error: { message: "Unauthorized", status: 401 },
//         });
//     });

//     test("get error message and 401 status code with bad token, a valid user id and valid followed id", async () => {
//         const res = await request(app)
//             .get(`/api/users/${testUserId}/followed/${test2UserId}`)
//             .set({ _token: "bad token" });
//         expect(res.statusCode).toBe(401);
//         expect(res.body).toEqual({
//             error: { message: "Unauthorized", status: 401 },
//         });
//     });

//     test("get error message and 403 status code with valid token, invalid user id and valid followed id", async () => {
//         const res = await request(app)
//             .get(`/api/users/${test2UserId}/followed/${test3UserId}`)
//             .set({ _token: testUserToken });
//         expect(res.statusCode).toBe(403);
//         expect(res.body).toEqual({
//             error: {
//                 message: "Cannot View Other User's Followed Users",
//                 status: 403,
//             },
//         });
//     });

//     test("get error message and 403 status code with valid token, invalid userId parameter type and valid followed id", async () => {
//         const res = await request(app)
//             .get(`/api/users/bad_type/followed/${testUserId}`)
//             .set({ _token: testUserToken });
//         expect(res.statusCode).toBe(403);
//         expect(res.body).toEqual({
//             error: {
//                 message: "Cannot View Other User's Followed Users",
//                 status: 403,
//             },
//         });
//     });
// });

// describe("POST /api/users/:userId/followed", () => {
//     test("get error message and 401 status code when sending in invalid token, valid userId and valid followedId", async () => {
//         const res = await request(app)
//             .post(`/api/users/${testUserId}/followed`)
//             .set({ _token: "bad token" })
//             .send({
//                 followedId: test2UserId,
//             });
//         expect(res.statusCode).toBe(401);
//         expect(res.body).toEqual({
//             error: { message: "Unauthorized", status: 401 },
//         });
//     });

//     test("get error message and 403 status code when sending in valid token, invalid userId and valid followedId", async () => {
//         const res = await request(app)
//             .post(`/api/users/1000/followed`)
//             .set({ _token: testUserToken })
//             .send({
//                 followedId: test2UserId,
//             });
//         expect(res.statusCode).toBe(403);
//         expect(res.body).toEqual({
//             error: {
//                 message: "Cannot View Other User's Followed Users",
//                 status: 403,
//             },
//         });
//     });

//     test("get error message and 403 status code when sending in valid token, invalid userId data type and valid followedId", async () => {
//         const res = await request(app)
//             .post(`/api/users/bad_type/followed`)
//             .set({ _token: testUserToken })
//             .send({
//                 followedId: test2UserId,
//             });
//         expect(res.statusCode).toBe(403);
//         expect(res.body).toEqual({
//             error: {
//                 message: "Cannot View Other User's Followed Users",
//                 status: 403,
//             },
//         });
//     });

//     test("get error message and 400 status code when sending in valid token, valid userId and invalid followedId", async () => {
//         const res = await request(app)
//             .post(`/api/users/${testUserId}/followed`)
//             .set({ _token: testUserToken })
//             .send({ followedId: "nope" });
//         expect(res.statusCode).toBe(400);
//         expect(res.body).toEqual({
//             error: {
//                 message: ["instance.followedId is not of a type(s) integer"],
//                 status: 400,
//             },
//         });
//     });

//     test("get created followed user and 201 status code when sending in valid token, valid userId and valid followedId", async () => {
//         const res = await request(app)
//             .post(`/api/users/${testUserId}/followed`)
//             .set({ _token: testUserToken })
//             .send({
//                 followedId: test2UserId,
//             });
//         expect(res.statusCode).toBe(201);
//         expect(res.body).toEqual({
//             email: "test@email.com",
//             exp: null,
//             fname: "tfn",
//             followedId: test2UserId,
//             lname: "tln",
//             totalBooks: null,
//             totalPages: null,
//             userId: testUserId,
//         });
//     });
// });

// describe("DELETE /api/users/:userId/followed/:followedId", () => {
//     test("get error message and 403 status code if valid token, other user's id and valid followed id", async () => {
//         const res = await request(app)
//             .delete(`/api/users/${test2UserId}/followed/${test3UserId}`)
//             .set({ _token: testUserToken });
//         expect(res.statusCode).toBe(403);
//         expect(res.body).toEqual({
//             error: {
//                 message: "Cannot View Other User's Followed Users",
//                 status: 403,
//             },
//         });
//     });

//     test("get error message and 401 status code if invalid token, valid user id and valid followed id", async () => {
//         const res = await request(app)
//             .delete(`/api/users/${testUserId}/followed/${test2UserId}`)
//             .set({ _token: "bad token" });
//         expect(res.statusCode).toBe(401);
//         expect(res.body).toEqual({
//             error: { message: "Unauthorized", status: 401 },
//         });
//     });

//     test("get error message and 403 status code if valid token, bad data type user id and valid followed id", async () => {
//         const res = await request(app)
//             .delete(`/api/users/bad_type/followed/${test2UserId}`)
//             .set({ _token: testUserToken });
//         expect(res.statusCode).toBe(403);
//         expect(res.body).toEqual({
//             error: {
//                 message: "Cannot View Other User's Followed Users",
//                 status: 403,
//             },
//         });
//     });

//     test("get deleted user followed message and 200 status code if valid token, valid user id and valid followed id", async () => {
//         const res = await request(app)
//             .delete(`/api/users/${testUserId}/followed/${test2UserId}`)
//             .set({ _token: testUserToken });
//         expect(res.statusCode).toBe(200);
//         expect(res.body).toEqual({
//             msg: expect.stringContaining("stopped following"),
//         });
//     });
// });
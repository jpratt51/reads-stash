"use strict";

const db = require("../../db");
const ExpressError = require("../../expressError");

class User {
    constructor(
        id,
        username,
        fname,
        lname,
        email,
        exp = 0,
        total_books = 0,
        total_pages = 0,
        password
    ) {
        this.id = id;
        this.username = username;
        this.fname = fname;
        this.lname = lname;
        this.email = email;
        this.exp = exp;
        this.totalBooks = total_books;
        this.totalPages = total_pages;
        this.password = password;
    }

    static async getAll() {
        const results = await db.query(
            "SELECT id, username, fname, lname, email, exp, total_books, total_pages FROM users;"
        );
        const users = results.rows.map(
            (u) =>
                new User(
                    u.id,
                    u.username,
                    u.fname,
                    u.lname,
                    u.email,
                    u.exp,
                    u.total_books,
                    u.total_pages
                )
        );
        return users;
    }

    static async getById(userId) {
        if (/^\d+$/.test(userId) === false)
            throw new ExpressError(`Invalid user id data type`, 400);
        const results = await db.query("SELECT * FROM users WHERE id = $1", [
            userId,
        ]);
        const u = results.rows[0];
        if (!u) {
            throw new ExpressError(`User ${userId} not found`, 404);
        }
        return new User(
            u.id,
            u.username,
            u.fname,
            u.lname,
            u.email,
            u.exp,
            u.total_books,
            u.total_pages
        );
    }

    static async getByUsername(username) {
        const results = await db.query(
            "SELECT id, username, fname, lname, email, exp, total_books, total_pages FROM users WHERE username = $1",
            [username]
        );
        const u = results.rows[0];
        if (!u) {
            throw new ExpressError(`User ${username} Not Found`, 404);
        }
        return new User(
            u.id,
            u.username,
            u.fname,
            u.lname,
            u.email,
            u.exp,
            u.total_books,
            u.total_pages
        );
    }

    static async getByUsernameForLogin(username) {
        const results = await db.query(
            "SELECT id, username, fname, lname, email, exp, total_books, total_pages, password FROM users WHERE username = $1",
            [username]
        );
        const u = results.rows[0];
        if (!u) {
            throw new ExpressError(`User ${username} Not Found`, 404);
        }
        return new User(
            u.id,
            u.username,
            u.fname,
            u.lname,
            u.email,
            u.exp,
            u.total_books,
            u.total_pages,
            u.password
        );
    }

    static async create(username, fname, lname, email, password) {
        const results = await db.query(
            "INSERT INTO users (username, fname, lname, email, password) VALUES ($1, $2, $3, $4, $5) RETURNING *",
            [username, fname, lname, email, password]
        );
        const u = results.rows[0];
        return new User(u.id, u.username, u.fname, u.lname, u.email);
    }

    async update() {
        await db.query(
            `UPDATE users
            SET username = $1,
            fname = $2,
            lname = $3,
            email = $4,
            exp = $5,
            total_books = $6,
            total_pages = $7
            WHERE id = $8;`,
            [
                this.username,
                this.fname,
                this.lname,
                this.email,
                this.exp,
                this.totalBooks,
                this.totalPages,
                this.id,
            ]
        );
    }

    async delete() {
        await db.query(`DELETE FROM users WHERE id = $1;`, [this.id]);
    }
}

module.exports = User;

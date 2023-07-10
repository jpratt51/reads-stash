DROP DATABASE IF EXISTS reads_stash;

CREATE DATABASE reads_stash;

\c reads_stash

CREATE TABLE users
(
    id SERIAL PRIMARY KEY,
    username VARCHAR(30) UNIQUE NOT NULL,
    fname VARCHAR(30) NOT NULL,
    lname VARCHAR(30) NOT NULL,
    email VARCHAR(50) NOT NULL,
    password VARCHAR(50) NOT NULL,
    exp INTEGER,
    total_books INTEGER,
    total_pages INTEGER
);

CREATE TABLE reads
(
    id SERIAL PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    description VARCHAR(500),
    isbn VARCHAR(20),
    avg_rating INTEGER,
    print_type VARCHAR(20)
);

CREATE TABLE collections
(
    id SERIAL PRIMARY KEY,
    name VARCHAR(30) NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users ON DELETE CASCADE
);

CREATE TABLE badges
(
    id SERIAL PRIMARY KEY,
    name VARCHAR(30) NOT NULL,
    thumbnail VARCHAR(30) NOT NULL
);

CREATE TABLE users_reads
(
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users ON DELETE CASCADE,
    read_id INTEGER NOT NULL REFERENCES reads ON DELETE CASCADE
);

CREATE TABLE authors
(
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL
);

CREATE TABLE publishers
(
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL
);

CREATE TABLE users_badges
(
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users ON DELETE CASCADE,
    badge_id INTEGER NOT NULL REFERENCES badges ON DELETE CASCADE
);

CREATE TABLE reads_collections
(
    id SERIAL PRIMARY KEY,
    read_id INTEGER NOT NULL REFERENCES reads ON DELETE CASCADE,
    collection_id INTEGER NOT NULL REFERENCES collections ON DELETE CASCADE
);

CREATE TABLE reads_authors
(
    id SERIAL PRIMARY KEY,
    read_id INTEGER NOT NULL REFERENCES reads ON DELETE CASCADE,
    author_id INTEGER NOT NULL REFERENCES authors ON DELETE CASCADE
);

CREATE TABLE reads_publishers
(
    id SERIAL PRIMARY KEY,
    read_id INTEGER NOT NULL REFERENCES reads ON DELETE CASCADE,
    publisher_id INTEGER NOT NULL REFERENCES publishers ON DELETE CASCADE
);

CREATE TABLE journals
(
    id SERIAL PRIMARY KEY,
    title VARCHAR(50) NOT NULL,
    date DATE NOT NULL,
    text VARCHAR(7500),
    user_id INTEGER NOT NULL REFERENCES users ON DELETE CASCADE
);

CREATE TABLE reads_ratings
(
    id SERIAL PRIMARY KEY,
    rating INTEGER NOT NULL,
    users_reads_id INTEGER NOT NULL REFERENCES users_reads ON DELETE CASCADE
);

CREATE TABLE reads_reviews
(
    id SERIAL PRIMARY KEY,
    review VARCHAR(7500) NOT NULL,
    date DATE NOT NULL,
    users_reads_id INTEGER NOT NULL REFERENCES users_reads ON DELETE CASCADE
);

CREATE TABLE followed
(
    id SERIAL PRIMARY KEY,
    followed_id INTEGER NOT NULL REFERENCES users ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users ON DELETE CASCADE
);

CREATE TABLE followers
(
    id SERIAL PRIMARY KEY,
    follower_id INTEGER NOT NULL REFERENCES users ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users ON DELETE CASCADE
);

CREATE TABLE recommendations
(
    id SERIAL PRIMARY KEY,
    recommendation VARCHAR(1000) NOT NULL,
    friend_id INTEGER NOT NULL REFERENCES users ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users ON DELETE CASCADE
);

-- DB test inserts- should insert correctly with no errors

-- INSERT INTO users
--     (username, fname, lname, email, password)
-- VALUES
--     ('test1user', 'test1fname', 'test1lname', 'test1email', 'test1password'),
--     ('test2user', 'test2fname', 'test2lname', 'test2email', 'test2password');

-- INSERT INTO reads
--     (title)
-- VALUES
--     ('test1read'),
--     ('test2read');

-- INSERT INTO collections
--     (name, user_id)
-- VALUES
--     ('test1collection', 1),
--     ('test2collection', 2);

-- INSERT INTO badges
--     (name, thumbnail)
-- VALUES
--     ('test1badge', 'test1thumbnail'),
--     ('test2badge', 'test2thumbnail');

-- INSERT INTO users_reads
--     (user_id, read_id)
-- VALUES
--     (1,1),
--     (2,2);

-- INSERT INTO authors
--     (name)
-- VALUES
--     ('test1author'),
--     ('test2author');

-- INSERT INTO publishers
--     (name)
-- VALUES
--     ('test1publisher'),
--     ('test2publisher');

-- INSERT INTO users_badges
--     (user_id, badge_id)
-- VALUES
--     (1,1),
--     (2,2);

-- INSERT INTO reads_collections
--     (read_id, collection_id)
-- VALUES
--     (1,1),
--     (2,2);

-- INSERT INTO reads_authors
--     (read_id, author_id)
-- VALUES
--     (1,1),
--     (2,2);

-- INSERT INTO reads_publishers
--     (read_id, publisher_id)
-- VALUES
--     (1,1),
--     (2,2);

-- INSERT INTO journals
--     (title, date, text, user_id)
-- VALUES
--     ('test1journal', '2023-07-09', 'test1journalEntry', 1),
--     ('test2journal', '2023-07-09', 'test2journalEntry', 2);

-- INSERT INTO reads_ratings
--     (rating, users_reads_id)
-- VALUES
--     (5, 1),
--     (4, 2);

-- INSERT INTO reads_reviews
--     (review, date, users_reads_id)
-- VALUES
--     ('test1review', '2023-07-09', 1),
--     ('test2review', '2023-07-09', 2);

-- INSERT INTO followed
--     (followed_id, user_id)
-- VALUES
--     (1, 2),
--     (2, 1);

-- INSERT INTO followers
--     (follower_id, user_id)
-- VALUES
--     (1,2),
--     (2,1);

-- INSERT INTO recommendations
--     (recommendation, friend_id, user_id)
-- VALUES
--     ('test1message', 2, 1),
--     ('test2message', 1, 2);

-- DB test queries

--testing users_reads Many-to-Many table joins correctly

-- SELECT users.username AS username, reads.title AS title FROM users_reads  JOIN users ON users_reads.user_id = users.id JOIN reads ON users_reads.read_id = reads.id;

-- Result:
--  username  |   title   
-- -----------+-----------
--  test1user | test1read
--  test2user | test2read

--testing users_badges Many-to-Many table joins correctly

-- SELECT users.username AS username, badges.name AS badge FROM users_badges JOIN users ON users_badges.user_id = users.id JOIN badges ON users_badges.badge_id = badges.id;

-- Result:
--  username  |   badge    
-- -----------+------------
--  test1user | test1badge
--  test2user | test2badge

--testing reads_collections Many-to-Many table joins correctly

-- SELECT reads.title AS read_title, collections.name AS collection_name FROM reads_collections JOIN reads ON reads_collections.read_id = reads.id JOIN collections ON reads_collections.collection_id = collections.id;

-- Result:
--  read_title | collection_name 
-- ------------+-----------------
--  test1read  | test1collection
--  test2read  | test2collection

--testing reads_authors Many-to-Many table joins correctly

-- SELECT reads.title AS read_title, authors.name AS author_name FROM reads_authors JOIN reads ON reads_authors.read_id = reads.id JOIN authors ON reads_authors.author_id = authors.id;

-- Result:
--  read_title | author_name 
-- ------------+-------------
--  test1read  | test1author
--  test2read  | test2author

--testing reads_publishers Many-to-Many joins correctly

-- SELECT reads.title AS read_title, publishers.name AS publisher_name FROM reads_publishers JOIN reads ON reads_publishers.read_id = reads.id JOIN publishers ON reads_publishers.publisher_id = publishers.id;

-- Result:
--  read_title | publisher_name 
-- ------------+----------------
--  test1read  | test1publisher
--  test2read  | test2publisher

--testing reads_ratings One-to-Many joins correctly

-- SELECT users_reads.read_id AS read_id, reads_ratings.rating AS rating FROM reads_ratings JOIN users_reads ON reads_ratings.users_reads_id = users_reads.read_id;

-- Result:
--  read_id | rating 
-- ---------+--------
--        1 |      5
--        2 |      4

--testing reads_reviews One-to-Many joins correctly

-- SELECT users_reads.read_id AS read_id, reads_reviews.review AS review FROM reads_reviews JOIN users_reads ON reads_reviews.users_reads_id = users_reads.read_id;

-- Result:
--  read_id |   review    
-- ---------+-------------
--        1 | test1review
--        2 | test2review

-- testing deleting user gives no error and deletes correctly

-- DELETE FROM users WHERE username = 'test1user';

-- Result:
-- DELETE 1

-- check that all dependencies of user deleted correctly

-- SELECT FROM users WHERE user_id = 1;
-- SELECT FROM collections WHERE user_id = 1;
-- SELECT FROM users_reads WHERE user_id = 1;
-- SELECT FROM users_badges WHERE user_id = 1;
-- SELECT FROM journals WHERE user_id = 1;
-- SELECT FROM followed WHERE user_id = 1;
-- SELECT FROM followers WHERE user_id = 1;
-- SELECT FROM followers WHERE user_id = 1;
-- SELECT FROM recommendations WHERE user_id = 1;

-- Result:
-- --
-- (0 rows)

-- --
-- (0 rows)

-- --
-- (0 rows)

-- --
-- (0 rows)

-- --
-- (0 rows)

-- --
-- (0 rows)

-- --
-- (0 rows)

-- --
-- (0 rows)

-- testing deleting read gives no error and deletes correctly

-- DELETE FROM reads WHERE id = 1;

-- Result:
-- DELETE 1

-- check that all dependencies of read deleted correctly

-- SELECT FROM users_reads WHERE read_id = 1;
-- SELECT FROM reads_collections WHERE read_id = 1;
-- SELECT FROM reads_authors WHERE read_id = 1;
-- SELECT FROM reads_publishers WHERE read_id = 1;

-- Result:
-- --
-- (0 rows)

-- --
-- (0 rows)

-- --
-- (0 rows)

-- --
-- (0 rows)
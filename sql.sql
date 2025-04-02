DROP TABLE IF EXISTS FriendRequest;
DROP TABLE IF EXISTS Friends;
DROP TABLE IF EXISTS Comments;
DROP TABLE IF EXISTS Posts;
DROP TABLE IF EXISTS Accounts;

CREATE TABLE If Not Exists Accounts (
    accountID INT NOT NULL AUTO_INCREMENT,
    email varchar(50) NOT NULL,
    phoneNumber bigint NOT NULL,
    username varchar(25) NOT NULL,
    fname varchar(25) NOT NULL,
    lname varchar(25) NOT NULL,
    dateJoined DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (accountID)
);

INSERT INTO Accounts (accountID, email, username, fname, lname, phoneNumber) VALUES
(1, 'robertjenner6@outlook.com', 'Outlook', 'Web', 'Outlook', '001111222333'),
(2, 'robertjenner5@me.com', 'Me', 'Web', 'Me', '123456789012');

CREATE TABLE If Not Exists Posts (
    postID INT NOT NULL AUTO_INCREMENT,
    content varchar(2500)  NOT NULL,
    postDate DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    accountID int NOT NULL,
    visibility ENUM('public', 'private', 'friends') NOT NULL DEFAULT 'public',
    PRIMARY KEY (postID),
    FOREIGN KEY (accountID) REFERENCES Accounts (accountID)
);

INSERT INTO Posts (content, accountID) VALUES
("Web's post!", 1),
("Lorem ipsum dolor sit amet consectetur adipisicing elit. Optio, et. Velit beatae dignissimos labore quidem cumque consequuntur blanditiis temporibus minus quaerat tenetur! Explicabo, quod mollitia!", 2);

CREATE TABLE If Not Exists Comments (
    commentID INT NOT NULL AUTO_INCREMENT,
    content varchar(750),
    sentDate DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    accountID int NOT NULL,
    postID int NOT NULL,
    PRIMARY KEY (commentID),
    FOREIGN KEY (accountID) REFERENCES Accounts (accountID),
    FOREIGN KEY (postID) REFERENCES Posts (postID)
);

INSERT INTO Comments (content, accountID, postID) VALUES
("Comment", 2, 1);

CREATE TABLE If Not Exists FriendRequest (
    senderID int NOT NULL,
    receiverID int NOT NULL,
    FOREIGN KEY (senderID) REFERENCES Accounts (accountID),
    FOREIGN KEY (receiverID) REFERENCES Accounts (accountID)
);

INSERT INTO FriendRequest (senderID, receiverID) VALUES
(1, 2);

CREATE TABLE If Not Exists Friends (
    accountID1 int NOT NULL,
    accountID2 int NOT NULL,
    FOREIGN KEY (accountID1) REFERENCES Accounts (accountID),
    FOREIGN KEY (accountID2) REFERENCES Accounts (accountID)
);

INSERT INTO Friends (accountID1, accountID2) VALUES
(1, 2);

CREATE TABLE If Not Exits PostLikes (
    postID int NOT NULL,
    accountID int NOT NULL,
    FOREIGN KEY (postID) REFERENCES Posts (postID),
    FOREIGN KEY (accountID) REFERENCES Accounts (accountID)
)

CREATE TABLE If Not Exits PostDislikes (
    postID int NOT NULL,
    accountID int NOT NULL,
    FOREIGN KEY (postID) REFERENCES Posts (postID),
    FOREIGN KEY (accountID) REFERENCES Accounts (accountID)
)

CREATE TABLE If Not Exits CommentLikes (
    commentID int NOT NULL,
    accountID int NOT NULL,
    FOREIGN KEY (commentID) REFERENCES Comments (commentID),
    FOREIGN KEY (accountID) REFERENCES Accounts (accountID)
)

CREATE TABLE If Not Exits CommentDislikes (
    commentID int NOT NULL,
    accountID int NOT NULL,
    FOREIGN KEY (commentID) REFERENCES Comments (commentID),
    FOREIGN KEY (accountID) REFERENCES Accounts (accountID)
)
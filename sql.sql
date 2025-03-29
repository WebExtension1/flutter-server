CREATE TABLE If Not Exists Accounts (
    accountID INT NOT NULL AUTO_INCREMENT,
    email varchar(50) NOT NULL,
    username varchar(25) NOT NULL,
    fname varchar(25) NOT NULL,
    lname varchar(25) NOT NULL,
    dateJoined DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (accountID)
);

INSERT INTO Accounts (email, username, fname, lname) VALUES
('webextension@email.com', 'WebExtension', 'Web', 'Extension'),
('user@email.com', 'OtherUser', 'Other', 'User');

CREATE TABLE If Not Exists Posts (
    postID INT NOT NULL AUTO_INCREMENT,
    content varchar(2500)  NOT NULL,
    postDate DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    accountID int NOT NULL,
    PRIMARY KEY (postID),
    FOREIGN KEY (accountID) REFERENCES Accounts (accountID)
);

INSERT INTO Posts (content, account) VALUES
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
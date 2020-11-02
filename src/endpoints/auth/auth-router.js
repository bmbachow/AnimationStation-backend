const express = require("express");
const AuthService = require("./auth-service");

const authRouter = express.Router();
const jsonBodyParser = express.json();

authRouter.post("/login", jsonBodyParser, (req, res, next) => {
    const { email, password } = req.body;
    const loginUser = { email, password };

    // validates that the request body contains the credentials fields
    for (const [key, value] of Object.entries(loginUser))
        if (value == null)
            return res.status(400).json({
                error: `Missing '${key}' in request body`,
            });

    // uses the email credential value to find a user from the database
    AuthService.getUserWithEmail(req.app.get("db"), loginUser.email)
        .then((dbUser) => {
            if (!dbUser)
                return res.status(400).json({
                    error: "Incorrect email or password",
                });

            // If a user is found by that posted email, the password credential
            // is validated against the bcrypted password in the database, by using bcrypt compare
            return AuthService.comparePasswords(
                loginUser.password,
                dbUser.password
            ).then((compareMatch) => {
                if (!compareMatch)
                    return res.status(400).json({
                        error: "Incorrect user_name or password",
                    });

                const sub = dbUser.email;
                const payload = { id: dbUser.id, full_name: dbUser.full_name };

                // if everything is good, an auth token is responded
                res.send({
                    authToken: AuthService.createJwt(sub, payload),
                    userId: AuthService.serializeUser(dbUser),
                });
            });
        })
        .catch(next);
});

module.exports = authRouter;

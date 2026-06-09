import dotenv from "dotenv";
dotenv.config();
const config = {
    development : {
        db : {
            dialect : 'postgres',
            database : process.env.DATABASE,
            username : process.env.USERNAME,
            password : process.env.DB_PASSWORD,
            host : 'localhost',
            port : 5432,
            connection_string : process.env.DATABASE_URL
        }
    },
    jwt : {
        secret : process.env.JWT_SECRET ?? "super-secret-change-me-in-production",
        expires_in : "7d"
    }
}

export default config;

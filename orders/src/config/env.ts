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
    services : {
        restaurants_url : process.env.RESTAURANTS_URL ?? "http://localhost:3002"
    }
}

export default config;

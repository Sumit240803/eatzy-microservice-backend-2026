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
        orders_url : process.env.ORDERS_URL ?? "http://localhost:3003"
    },
    redis : {
        url : process.env.REDIS_URL ?? "redis://localhost:6379"
    }
}

export default config;

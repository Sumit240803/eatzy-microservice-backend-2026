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
    redis : {
        url : process.env.REDIS_URL ?? "redis://localhost:6379"
    },
    services : {
        auth_url : process.env.AUTH_URL ?? "http://localhost:3001"
    },
    smtp : {
        host : process.env.SMTP_HOST ?? "",
        port : parseInt(process.env.SMTP_PORT ?? "587", 10),
        user : process.env.SMTP_USER ?? "",
        pass : process.env.SMTP_PASS ?? "",
        from : process.env.SMTP_FROM ?? "Eatzy <no-reply@eatzy.local>"
    }
}

export default config;

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const body_parser_1 = __importDefault(require("body-parser"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const http_1 = __importDefault(require("http"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const socket_io_1 = require("socket.io");
const messageSocket_1 = require("./sockets/messageSocket");
/* ROUTE IMPORTS */
const projectRoutes_1 = __importDefault(require("./routes/projectRoutes"));
const taskRouter_1 = __importDefault(require("./routes/taskRouter"));
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const refreshTokenRoutes_1 = __importDefault(require("./routes/refreshTokenRoutes"));
const teamRoutes_1 = __importDefault(require("./routes/teamRoutes"));
const messageRouter_1 = __importDefault(require("./routes/messageRouter"));
const assetRoutes_1 = __importDefault(require("./routes/assetRoutes"));
const creativeRoutes_1 = __importDefault(require("./routes/creativeRoutes"));
const swagger_1 = require("./swagger");
const uploadRoutes_1 = __importDefault(require("./routes/uploadRoutes"));
/* CONFIGURATIONS */
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use((0, helmet_1.default)());
app.use(helmet_1.default.crossOriginResourcePolicy({ policy: "cross-origin" }));
app.use((0, morgan_1.default)("common"));
app.use(body_parser_1.default.json());
app.use(body_parser_1.default.urlencoded({ extended: false }));
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL,
    credentials: true,
}));
const server = http_1.default.createServer(app);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL,
        methods: ["GET", "POST"],
        credentials: true,
    },
});
/* SOCKET.IO */
(0, messageSocket_1.initMessageSocket)(io);
/* COOKIES */
app.use((0, cookie_parser_1.default)());
const uploadsDir = path_1.default.join(__dirname, "..", "uploads");
if (!fs_1.default.existsSync(uploadsDir)) {
    fs_1.default.mkdirSync(uploadsDir, { recursive: true });
}
app.use("/uploads", express_1.default.static(uploadsDir));
/* ROUTES */
app.get("/", (req, res) => {
    res.send("This is test route");
});
app.use("/api/auth", authRoutes_1.default);
app.use("/api/refresh/", refreshTokenRoutes_1.default);
// Protected routes
app.use("/api/projects", projectRoutes_1.default);
app.use("/api/tasks", taskRouter_1.default);
app.use("/api/users", userRoutes_1.default);
app.use("/api/teams", teamRoutes_1.default);
app.use("/api/messages", messageRouter_1.default);
app.use("/api/assets", assetRoutes_1.default);
app.use("/api/creative", creativeRoutes_1.default);
app.use("/api/uploads", uploadRoutes_1.default);
/* SERVER */
const port = Number(process.env.PORT) || 8000;
// Swagger docs route
app.use('/api-docs', swagger_1.swaggerUi.serve, swagger_1.swaggerUi.setup(swagger_1.swaggerSpec));
server.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

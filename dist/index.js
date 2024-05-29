"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const router_1 = __importDefault(require("./routers/router"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)({
    origin: "http://localhost:3000",
    optionsSuccessStatus: 200,
    credentials: true,
}));
app.use(express_1.default.json());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// parse requests of content-type - application/json
app.use(express_1.default.json()); /* bodyParser.json() is deprecated */
app.use(express_1.default.urlencoded({ extended: true })); /* bodyParser.urlencoded() is deprecated */
app.use("/api/v1/", router_1.default);
app.listen(3000, () => console.log('Example app listening on port 3000!'));

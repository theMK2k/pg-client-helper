import { logger } from "../lib/pg-client-helper";

describe("Logger behavior based on PG_CLIENT_HELPER_LOGLEVEL", () => {
    const originalConsoleLog = console.log;
    const originalConsoleInfo = console.info;
    const originalConsoleWarn = console.warn;
    const originalConsoleError = console.error;

    beforeEach(() => {
        console.log = jest.fn();
        console.info = jest.fn();
        console.warn = jest.fn();
        console.error = jest.fn();
    });

    afterEach(() => {
        console.log = originalConsoleLog;
        console.info = originalConsoleInfo;
        console.warn = originalConsoleWarn;
        console.error = originalConsoleError;
    });

    it("should log everything when PG_CLIENT_HELPER_LOGLEVEL=DEBUG", () => {
        process.env.PG_CLIENT_HELPER_LOGLEVEL = "DEBUG";
        logger.log("test log");
        logger.info("test info");
        logger.warn("test warn");
        logger.error("test error");

        expect(console.log).toHaveBeenCalledWith("test log");
        expect(console.info).toHaveBeenCalledWith("test info");
        expect(console.warn).toHaveBeenCalledWith("test warn");
        expect(console.error).toHaveBeenCalledWith("test error");
    });

    it("should log from INFO level when PG_CLIENT_HELPER_LOGLEVEL=INFO", () => {
        process.env.PG_CLIENT_HELPER_LOGLEVEL = "INFO";
        logger.log("test log");
        logger.info("test info");
        logger.warn("test warn");
        logger.error("test error");

        expect(console.log).not.toHaveBeenCalled();
        expect(console.info).toHaveBeenCalledWith("test info");
        expect(console.warn).toHaveBeenCalledWith("test warn");
        expect(console.error).toHaveBeenCalledWith("test error");
    });

    it("should log from WARN level when PG_CLIENT_HELPER_LOGLEVEL=WARN", () => {
        process.env.PG_CLIENT_HELPER_LOGLEVEL = "WARN";
        logger.log("test log");
        logger.info("test info");
        logger.warn("test warn");
        logger.error("test error");

        expect(console.log).not.toHaveBeenCalled();
        expect(console.info).not.toHaveBeenCalled();
        expect(console.warn).toHaveBeenCalledWith("test warn");
        expect(console.error).toHaveBeenCalledWith("test error");
    });

    it("should log only ERRORs when PG_CLIENT_HELPER_LOGLEVEL=ERROR", () => {
        process.env.PG_CLIENT_HELPER_LOGLEVEL = "ERROR";
        logger.log("test log");
        logger.info("test info");
        logger.warn("test warn");
        logger.error("test error");

        expect(console.log).not.toHaveBeenCalled();
        expect(console.info).not.toHaveBeenCalled();
        expect(console.warn).not.toHaveBeenCalled();
        expect(console.error).toHaveBeenCalledWith("test error");
    });

    it("should log nothing when PG_CLIENT_HELPER_LOGLEVEL=SILENT", () => {
        process.env.PG_CLIENT_HELPER_LOGLEVEL = "SILENT";
        logger.log("test log");
        logger.info("test info");
        logger.warn("test warn");
        logger.error("test error");

        expect(console.log).not.toHaveBeenCalled();
        expect(console.info).not.toHaveBeenCalled();
        expect(console.warn).not.toHaveBeenCalled();
        expect(console.error).not.toHaveBeenCalled();
    });
});

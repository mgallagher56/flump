import {
  type ArgumentsHost,
  BadRequestException,
  HttpException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { reportException } from "./sentry";
import { SentryExceptionFilter } from "./sentry-exception.filter";

vi.mock("./sentry", () => ({ reportException: vi.fn() }));

const reply = { status: vi.fn().mockReturnThis(), json: vi.fn(), send: vi.fn() };
const adapter = {
  reply: vi.fn(),
  isHeadersSent: () => false,
  getRequestUrl: () => "/x",
  getRequestMethod: () => "GET",
};

function host(headers: Record<string, unknown> = {}): ArgumentsHost {
  return {
    switchToHttp: () => ({ getRequest: () => ({ headers }), getResponse: () => reply }),
    getType: () => "http",
    getArgByIndex: () => reply,
  } as unknown as ArgumentsHost;
}

describe("SentryExceptionFilter", () => {
  beforeAll(() => Logger.overrideLogger(false));
  let filter: SentryExceptionFilter;
  beforeEach(() => {
    vi.clearAllMocks();
    filter = new SentryExceptionFilter(adapter as never);
  });

  it("captures a 500 HttpException with the request id and delegates", () => {
    filter.catch(new HttpException("x", 500), host({ "x-request-id": "abc-1" }));
    expect(reportException).toHaveBeenCalledWith(expect.any(HttpException), "abc-1");
    expect(adapter.reply).toHaveBeenCalled();
  });

  it("captures unexpected non-Http errors", () => {
    filter.catch(new Error("kaboom"), host());
    expect(reportException).toHaveBeenCalledWith(expect.any(Error), undefined);
    expect(adapter.reply).toHaveBeenCalled();
  });

  it.each([new BadRequestException(), new UnauthorizedException(), new NotFoundException()])(
    "does not capture %s",
    (err) => {
      filter.catch(err, host());
      expect(reportException).not.toHaveBeenCalled();
      expect(adapter.reply).toHaveBeenCalled();
    },
  );

  it("drops an unsafe request id", () => {
    filter.catch(new Error("x"), host({ "x-request-id": "a b\n<script>" }));
    expect(reportException).toHaveBeenCalledWith(expect.any(Error), undefined);
  });
});

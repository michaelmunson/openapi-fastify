import {describe, it, expect} from "@jest/globals";
import { $ } from "../integration/app/app";
import '../integration/app/routes';

describe("Unit", () => {
  it("should return the correct specification", () => {
    const specification = $.specification;
    expect(specification.paths["/users/{id}/posts"]).toHaveProperty('get');
  });
});
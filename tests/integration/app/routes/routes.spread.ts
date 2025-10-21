import { $ } from "../app";
import { dbHelpers } from "../db.mock";

const get_spec = $.spec(<const>{
  summary: "Get a user by id",
  parameters: [
    {
      name: "id",
      in: "path",
      required: true,
      schema: { type: "integer" }
    }
  ],
  responses: {
    200: {
      description: "User object",
      content: {
        "application/json": {
          schema: $.ref('#/components/schemas/User')
        } 
      }
    },
    404: {
      description: "User not found",
      content: {
        "application/json": {
          schema: { type: "object", properties: { error: { type: "string" } } }
        }
      }
    }
  }
})

type Spec = typeof get_spec;

const get_handler = $.handler<Spec>(async (request) => {
  const { id } = request.params;
  const user = dbHelpers.getUserById(Number(id));
  if (!user) return {error: "User not found"};
  return user;
});

$.route("/users/:id", {
  get: $.op(get_spec, get_handler)
});
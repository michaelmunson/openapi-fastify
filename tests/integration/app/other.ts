import { $ } from "./app";
import './routes';

(async () => {
    console.log($.specification);
    const input = "/users/:id/posts/:postId/:asd/:asd2";
    const output = input.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, "{$1}");
    console.log(output); 
})();
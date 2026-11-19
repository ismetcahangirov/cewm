import { createCn } from "cn/config";

export const cn = createCn({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: [
            "display",
            "statement",
            "h1",
            "h2",
            "intro",
            "h3",
            "h4",
            "menu",
            "lead",
            "card",
            "base",
            "small",
            "meta",
            "badge",
          ],
        },
      ],
    },
  },
});

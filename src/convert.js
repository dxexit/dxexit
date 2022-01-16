import { Converter } from "showdown";
import DOMPurify from "dompurify";

const converter = new Converter(
    {
        simplifiedAutoLink: true,
        strikethrough: true,
        tables: true,
        tasklists: true,
        openLinksInNewWindow: true,
        
    }
);

export const markdown_to_html = markdown => DOMPurify.sanitize(converter.makeHtml(markdown));
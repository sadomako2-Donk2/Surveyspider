# Third-party browser libraries

Served by server.mjs from /vendor/ so the site doesn't depend on outside CDNs (and a compromised CDN
can't change what runs on the site). Copied unchanged from the npm registry (`npm pack`, which checks
each package's sha512 integrity):

| File | Package | Licence |
| --- | --- | --- |
| exceljs.min.js | exceljs@4.4.0 (dist/exceljs.min.js) | MIT |
| mammoth.browser.min.js | mammoth@1.6.0 | BSD-2-Clause |
| pdf.min.js, pdf.worker.min.js | pdfjs-dist@3.11.174 (build/) | Apache-2.0 |

To update one, `npm pack <package>@<version>`, copy the same file here, and update this table and the licence file.

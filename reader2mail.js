#!/usr/bin/env node
var { Readability } = require('@mozilla/readability');
const fetch = require('node-fetch');
var { JSDOM } = require('jsdom');
const nodemailer = require('nodemailer');

class Elem {
  constructor(tag, attrs, children) {
    this.tag = tag;
    this.attrs = attrs;
    this.children = children;
  }

  static p(attrs, children) {
    return new Elem('p', attrs, children);
  }

  static em(attrs, children) {
    return new Elem('em', attrs, children);
  }

  static a(attrs, children) {
    return new Elem('a', attrs, children);
  }

  render(document) {
    let elem = document.createElement(this.tag);
    if (this.attrs != null) {
      for (const [k, v] of Object.entries(this.attrs)) {
        elem.setAttribute(k, v);
      }
    }
    if (this.children != null) {
      for (let ch of this.children) {
        if (typeof ch == 'string') {
          elem.appendChild(document.createTextNode(ch))
        } else if (ch instanceof Elem) {
          elem.appendChild(ch.render(document));
        } else {
          throw `unhandled element ${ch}`
        }
      }
    }
    return elem;
  }
}

async function fetch_page(url) {
  let document_resp = await fetch(url);
  let document_text = await document_resp.text()

  let doc = new JSDOM(document_text, { url: url })
  let parsed = new Readability(doc.window.document).parse();
  let reader_dom = new JSDOM(parsed.content);

  for (let img of reader_dom.window.document.querySelectorAll('img')) {
    img.remove();
  }

  let transporter = nodemailer.createTransport({
    sendmail: true,
    newline: 'unix',
    args: ["-i", "-f", "reader2mail@internal", "sell"],
    attachDataUrls: true,
  });

  (function(document) {
    document.body.prepend(Elem.p(null, [
      Elem.em(null, [
        `Retrieved from `,
        Elem.a({'href': url}, [`${url}`]),
        ` on ${new Date().toISOString()}`,
       ])
      ]).render(document))
  }(reader_dom.window.document))

  return transporter.sendMail({
    from: 'reader2mail@internal',
    to: ['sell'],
    subject: parsed.title,
    html: reader_dom.serialize(),
  })
}

if (process.argv[2] == null) {
  console.log("need url argument");
  process.exit(1);
} else {
  fetch_page(process.argv[2]).then(res => {
    console.log("result", res);
    process.exit(0);
  }).catch(err => {
    console.log("error", err);
    process.exit(1);
  });
}

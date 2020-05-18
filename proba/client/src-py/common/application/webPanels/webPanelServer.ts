// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import * as Cors from '@koa/cors';
import * as http from 'http';
import * as Koa from 'koa';
import * as compress from 'koa-compress';
import * as logger from 'koa-logger';
import * as path from 'path';

import { EXTENSION_ROOT_DIR } from '../../../constants';
import { Identifiers } from '../../../datascience/constants';
import { SharedMessages } from '../../../datascience/messages';
import { IFileSystem } from '../../platform/types';

interface IState {
    cwd: string;
    outDir: string;
}

export class WebPanelServer {
    private app: Koa = new Koa();
    private server: http.Server | undefined;
    private state = new Map<string, IState>();

    constructor(private port: number, private token: string, private fs: IFileSystem) {
        this.app.use(Cors());
        this.app.use(compress());
        this.app.use(logger());
        this.app.use(async (ctx) => {
            try {
                // Either token is passed or cookie exists, otherwise insecure connection
                if (ctx.query.token) {
                    if (ctx.query.token === this.token) {
                        if (ctx.query.scripts) {
                            this.generateMainResponse(ctx);
                        } else {
                            await this.generateFileResponse(ctx);
                        }
                    }
                } else {
                    const id = ctx.cookies.get('id');
                    const state = id ? this.state.get(id) : undefined;
                    if (state) {
                        if (ctx.query.scripts) {
                            this.generateMainResponse(ctx);
                        } else {
                            await this.generateFileResponse(ctx);
                        }
                    }
                }
            } catch (e) {
                ctx.body = `<div>${e}</div>`;
            }
        });
    }

    public start() {
        this.server = this.app.listen(this.port, 'localhost');
        return this.server;
    }

    public dispose() {
        this.close();
    }

    public close() {
        if (this.server) {
            this.server.close();
            this.server = undefined;
        }
    }

    private generateMainResponse(ctx: Koa.ParameterizedContext) {
        const id = ctx.path.substr(1);
        let state = this.state.get(id);
        if (!state) {
            state = {
                cwd: ctx.query.cwd,
                outDir: ctx.query.rootPath
            };
            this.state.set(id, state);
        }
        ctx.body = this.generateReactHtml(ctx.query);
        ctx.cookies.set('id', id);
        ctx.type = 'html';
    }

    private async generateFileResponse(ctx: Koa.ParameterizedContext) {
        const id = ctx.cookies.get('id');
        const state = id ? this.state.get(id) : undefined;
        const cwd = state ? state.cwd : process.cwd();
        const root = state ? state.outDir : cwd;
        let filePath = path.join(cwd, ctx.url);

        switch (ctx.url) {
            case '/editor.worker.js':
                // This is actually in the root out folder
                filePath = path.join(EXTENSION_ROOT_DIR, 'out', ctx.url);
                break;

            case '/index_chunked_bundle.js':
                // This is in the root folder
                filePath = path.join(root, ctx.url);
                break;

            // Here is where we'd likely support loading split bundles.
            default:
                if (ctx.url.includes('_chunk_bundle.js')) {
                    filePath = path.join(root, path.basename(ctx.url));
                }
                break;
        }
        ctx.body = this.fs.createReadStream(filePath);
    }

    // Debugging tips:
    // As the developer tools no longer work when using an http source for an iframe, it can be difficult to debug the code below.
    // Here's some tips:
    // 1) If you get no output, try entering the URL of the server into Chrome on the same machine as the extension.
    //    You can then debug this code outside of a frame, but only the raw startup of the frame.
    //    Note, the URL is usually http://localhost:9000?queryparams, not http://localhost:9890 as this is the remapped URL
    // 2) If you get the wrong output, and you think the error is in the react code, do the following:
    //    a) Run the same code in the real product under the debugger
    //    b) Find the <-- GET /e7414d50-33f7-4147-837e-4e79c5a4ec61?scripts=... entry in the debug output.
    //    c) Copy this value but add '&testMode=true' to the end of it.
    //    d) Paste http://localhost:9000/<value from step c> into the browser
    //    e) Debug the rendering.
    //       Note you might have to change generateTestState in mainState.ts to get the cells you want to show up.
    //       One good way to do so is to open the json for the offending notebook and copy it into one of the test cells.
    // 3) If you suspect some of the code below but you do get output on startup, copy some of the code into a codepen and debug it there.

    // tslint:disable: no-any
    private generateReactHtml(query: any) {
        const scripts = query.scripts ? (Array.isArray(query.scripts) ? query.Scripts : [query.scripts]) : [''];
        const testMode = query.testMode ? true : false;

        return `<!doctype html>
        <html lang="en">
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width,initial-scale=1,shrink-to-fit=no">
                <meta http-equiv="Content-Security-Policy" content="img-src 'self' data: https: http: blob:; default-src 'unsafe-inline' 'unsafe-eval' vscode-resource: data: https: http: blob:;">
                <meta name="theme-color" content="#000000">
                <meta name="theme" content="${Identifiers.GeneratedThemeName}"/>
                <title>VS Code Python React UI</title>
            </head>
            <body class='${query.baseTheme}'>
                <noscript>You need to enable JavaScript to run this app.</noscript>
                <div id="root"></div>
                <script type="text/javascript">
                ${this.getVsCodeApiScript({})}
                </script>
                <script type="text/javascript">
                window.inTestMode = ${testMode};
                </script>
                <script type="text/javascript">
                    function resolvePath(relativePath) {
                        if (relativePath && relativePath[0] == '.' && relativePath[1] != '.') {
                            return relativePath.substring(1);
                        }

                        return relativePath;
                    }
                </script>
                <script type="text/javascript">
                ${this.getStyleUpdateScript()}
                </script>
                ${scripts
                    .map((script: string) => `<script type="text/javascript" src="${script}"></script>`)
                    .join('\n')}
            </body>
        </html>`;
    }

    private getVsCodeApiScript(state: any) {
        return `
            const acquireVsCodeApi = (function() {
                const originalPostMessage = window.parent.postMessage.bind(window.parent);
                const targetOrigin = '*';
                let acquired = false;

                let state = ${state ? `JSON.parse("${JSON.stringify(state)}")` : undefined};
                window.console.log('acquired vscode api');

                // Special case, because we don't have a way to get the vscode api more than once,
                // hook up some global handlers here.
                document.addEventListener('keydown', (e) => {
                    // Forward this message to the inner most frame that VS code owns.
                    originalPostMessage({ command: 'did-keydown', data: {
                        key: e.key,
                        keyCode: e.keyCode,
                        code: e.code,
                        shiftKey: e.shiftKey,
                        altKey: e.altKey,
                        ctrlKey: e.ctrlKey,
                        metaKey: e.metaKey,
                        repeat: e.repeat
                    }}, '*');
                })

                return () => {
                    if (acquired) {
                        throw new Error('An instance of the VS Code API has already been acquired');
                    }
                    acquired = true;
                    return Object.freeze({
                        postMessage: function(msg) {
                            return originalPostMessage({ command: 'onmessage', data: msg }, targetOrigin);
                        },
                        setState: function(newState) {
                            state = newState;
                            originalPostMessage({ command: 'do-update-state', data: JSON.stringify(newState) }, targetOrigin);
                            return newState;
                        },
                        getState: function() {
                            return state;
                        }
                    });
                };
            })();
            delete window.parent;
            delete window.top;
            delete window.frameElement;
        `;
    }

    private getStyleUpdateScript() {
        return `
            window.addEventListener('message', (ev) => {
                // Do all of this here instead of in the react code so that whether or not we're using a server is
                // transparent to the react code. It just assumes the root is correct.
                if (ev.data && ev.data.type && ev.data.type === '${SharedMessages.StyleUpdate}') {
                    window.console.log('WebServer Frame: Received style update');
                    try {
                        document.documentElement.setAttribute('style', ev.data.payload.styleText);
                        document.body.classList.remove('vscode-light', 'vscode-dark', 'vscode-high-contrast');
                        document.body.classList.add(ev.data.payload.bodyClass);
                        let defaultStylesNode = document.getElementById('_defaultStyles');
                        if (defaultStylesNode) {
                            defaultStylesNode.remove();
                        }
                        defaultStylesNode = document.createElement('style');
                        defaultStylesNode.appendChild(document.createTextNode(ev.data.payload.defaultStyles));
                        document.head.appendChild(defaultStylesNode);

                        // The body padding is off because of the assumptions made about frames being inside of each other
                        // Remove the padding on the body style
                        const rules = [...defaultStylesNode.sheet.cssRules];
                        const index = rules.findIndex(r => r.selectorText === 'body');
                        if (index >= 0) {
                            rules[index].style.padding = '';
                        }

                    } catch (e) {
                        window.console.log('WebServer Frame: error ' + e.toString());
                    }
                } else if (ev.data && ev.data.type) {
                    window.console.log('WebServer Frame: Received message ' + ev.data.type);
                }
            });
        `;
    }
}

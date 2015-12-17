import fs = require('fs');
import net = require('net');
import http = require('http');
import path = require('path');
import crypto = require('crypto');

namespace LSynth {

    type Socket = net.Socket;
    type Server = http.Server;
    type ServerRequest = http.ServerRequest;
    type ReadStream = fs.ReadStream;

    class Exception { }
    class FileNotFoundException extends Exception { }

    class ContentType {

        static html: string = "text/html";
        static plain: string = "text/plain";
        static js: string = "text/javascript";
        static css: string = "text/css";

        static parse(url): string {

            if (/\/css\//.test(url)) {
                return ContentType.css;
            }
            if (/\/js\//.test(url)) {
                return ContentType.js;
            }
            if (/\//.test(url) || /\/index/.test(url)) {
                return ContentType.html;
            }
            return ContentType.plain;
        }
    }

    interface IRoute {

        url: string;
        target: string;
        content: string;
    }

    class Route implements IRoute {

        public url: string;
        public target: string;
        public content: string;

        constructor(url: string, target: string) {

            this.url = url;
            this.target = "/client/html/" + target;
        }

        public compile(): void {

        }
    }

    class File {

        static getReadStream(url): ReadStream {

            try {
                var file: string = path.join(__dirname, url);
                var stat: fs.Stats = fs.statSync(file);
                return fs.createReadStream(file);
            }
            catch (e) {
                throw new FileNotFoundException;
            }
        }

        static read(url): string {

            try {
                var file: string = path.join(__dirname, url);
                return fs.readFileSync(file, 'utf8');
            }
            catch (e) {
                throw new FileNotFoundException;
            }
        }
    }

    interface AppContent {
        header: string;
        footer: string;
    }

    class App {

        static content: AppContent;

        static routes: { [name: string]: Route } = {

            index: new Route('/index', 'home.html'),
           
        }

        static lookupRoute(path: string): Route {

            if (path === "/") {
                return App.routes['index'];
            }

            for (var i in App.routes) {

                var route = App.routes[i];
                if (path.indexOf(route.url) === 0) {
                    return route;
                }
            }

            return null;
        }

        static init() {

            try {
                // Retrieve app content
                var content = File.read("/client/html/lsynth.html").split("<content />");
                App.content = {
                    header: content[0],
                    footer: content[1]
                }

                for (var i in App.routes) {
                    try {
                        var route = App.routes[i];
                        route.content = File.read(route.target);
                    }
                    catch (e) { console.log(e); }
                }
            }
            catch (e) {
                debugger;
            }
        }

        public static render(view: Route): string {

            return App.content.header + view.content + App.content.footer;
        }
    }

    export class WebServer {

        static port: number = process.env.port || 1337;

        static server: Server;

        static init() {

            App.init();
            WebServer.start();
        }

        static start() {

            this.server = http.createServer(WebServer.listener).listen(WebServer.port);
        }

        static listener(request: http.ServerRequest, response: http.ServerResponse) {

            //console.log(request.headers);
    
            // Look for route
            var route = App.lookupRoute(request.url);
            if (route) {

                var contentType = ContentType.parse(request.url);
                response.writeHead(200, { 'Content-Type': contentType });
                var data = App.render(route);
                response.write(data);
                response.end();
            }
            else {

                // Not a route. Serve a file
                try {
                    var url = "/client" + request.url;
                    var rs = File.getReadStream(url);

                    response.writeHead(200, { 'Content-Type': ContentType.parse(url) });
                    rs.pipe(response);
                }
                catch (e) {
                    response.writeHead(404);
                    response.end();
                }
            }
        }
    }
}

LSynth.WebServer.init();
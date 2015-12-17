var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var fs = require('fs');
var http = require('http');
var path = require('path');
var LSynth;
(function (LSynth) {
    var Exception = (function () {
        function Exception() {
        }
        return Exception;
    })();
    var FileNotFoundException = (function (_super) {
        __extends(FileNotFoundException, _super);
        function FileNotFoundException() {
            _super.apply(this, arguments);
        }
        return FileNotFoundException;
    })(Exception);
    var ContentType = (function () {
        function ContentType() {
        }
        ContentType.parse = function (url) {
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
        };
        ContentType.html = "text/html";
        ContentType.plain = "text/plain";
        ContentType.js = "text/javascript";
        ContentType.css = "text/css";
        return ContentType;
    })();
    var Route = (function () {
        function Route(url, target) {
            this.url = url;
            this.target = "/client/html/" + target;
        }
        Route.prototype.compile = function () {
        };
        return Route;
    })();
    var File = (function () {
        function File() {
        }
        File.getReadStream = function (url) {
            try {
                var file = path.join(__dirname, url);
                var stat = fs.statSync(file);
                return fs.createReadStream(file);
            }
            catch (e) {
                throw new FileNotFoundException;
            }
        };
        File.read = function (url) {
            try {
                var file = path.join(__dirname, url);
                return fs.readFileSync(file, 'utf8');
            }
            catch (e) {
                throw new FileNotFoundException;
            }
        };
        return File;
    })();
    var App = (function () {
        function App() {
        }
        App.lookupRoute = function (path) {
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
        };
        App.init = function () {
            try {
                // Retrieve app content
                var content = File.read("/client/html/lsynth.html").split("<content />");
                App.content = {
                    header: content[0],
                    footer: content[1]
                };
                for (var i in App.routes) {
                    try {
                        var route = App.routes[i];
                        route.content = File.read(route.target);
                    }
                    catch (e) {
                        console.log(e);
                    }
                }
            }
            catch (e) {
                debugger;
            }
        };
        App.render = function (view) {
            return App.content.header + view.content + App.content.footer;
        };
        App.routes = {
            index: new Route('/index', 'home.html'),
        };
        return App;
    })();
    var WebServer = (function () {
        function WebServer() {
        }
        WebServer.init = function () {
            App.init();
            WebServer.start();
        };
        WebServer.start = function () {
            this.server = http.createServer(WebServer.listener).listen(WebServer.port);
        };
        WebServer.listener = function (request, response) {
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
        };
        WebServer.port = process.env.port || 1337;
        return WebServer;
    })();
    LSynth.WebServer = WebServer;
})(LSynth || (LSynth = {}));
LSynth.WebServer.init();
//# sourceMappingURL=server.js.map
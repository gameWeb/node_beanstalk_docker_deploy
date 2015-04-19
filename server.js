var Hapi= require('hapi');

HapiServer = new Hapi.Server();

HapiServer.connection({
    port : 3007,
    labels: ['eb_deploy']
});

HapiServer.route({
    method: 'GET',
    path: '/',
    handler: function (request, reply) {
        console.log("Called: " + request.path);
        reply("Success deployed")
            .code(200);
    }
});
HapiServer.route({
    method: 'GET',
    path: '/test1',
    handler: function (request, reply) {
        console.log("Called: " + request.path);
        reply("Success test1")
            .code(200);
    }
});
HapiServer.route({
    method: 'GET',
    path: '/test2',
    handler: function (request, reply) {
        console.log("Called: " + request.path);
        reply("Success test2")
            .code(200);
    }
});
HapiServer.start(function () {
    console.log('info', 'Server running at: ' + HapiServer.info.uri);
});

console.log('deployed');

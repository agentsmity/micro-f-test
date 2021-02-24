module.exports = {
    port: 33333,

    rpc: {
        timeout: 5000,
        userQueue: 'rpc_queue',
        routeMethods: []
    },

    queueManager: {
        connection: {
            heartbeat: 0,
            host: 'rabbitmq',
            port: 5672,
            login: 'hhhh',
            password: 'hhhh',
            vhost: '/'
        },

        rpcExchange: {
            name: 'rpcExchange',
            type: 'direct'
        },

        interactionExchange: {
            name: 'interactionExchange',
            type: 'topic'
        }
    }
};
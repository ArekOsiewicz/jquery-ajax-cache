export function addFilterToJquery($ajaxCache) {

    let $ = $ajaxCache.$;

    $.ajaxPrefilter(function(options, originalOptions, jqXHR) {

        let cacheProxy = $ajaxCache.getCacheProxy();

        let ajaxCacheOptions = options.ajaxCache;

        if (ajaxCacheOptions) {
            var storage = cacheProxy.getStorage(ajaxCacheOptions.storageType);

            if (!storage.isSupported()) {
                return;
            }

            try {
                var cacheKey = cacheProxy.genCacheKey(options, originalOptions, ajaxCacheOptions.preGenCacheKey);
                var value = storage.get(cacheKey);

                // force reflash cache
                if (ajaxCacheOptions.forceRefresh === true) {
                    storage.delete(cacheKey);
                    value = null;
                }

                if (!value) {
                    // If it not in the cache, we store the data, add success callback - normal callback will proceed
                    var realsuccess;
                    if (options.success) {
                        realsuccess = options.success;
                    }
                    options.success = function(data) {

                        var exp = cacheProxy.defaultTimeout;
                        if (typeof ajaxCacheOptions.timeout === 'number') {
                            exp = ajaxCacheOptions.timeout;
                        }
                        try {
                            let cacheValidateFun = ajaxCacheOptions.cacheValidate || cacheProxy.getCacheValidateFun();
                            if (typeof cacheValidateFun === 'function') {
                                if (cacheValidateFun.call(null, data, options)) {
                                    // 业务逻辑的判断这个请求是否真正成功的请求。
                                    LZUTF8.compressAsync(JSON.stringify(data), {
                                        outputEncoding: "BinaryString"
                                    }, function(result, error) {
                                        if (error === undefined) {
                                            console.log("Data successfully compressed and encoded to " + result.length + " characters");
                                            storage.set(cacheKey, result, {
                                                exp: exp
                                            });
                                        } else
                                            console.log("Compression error: " + error.message);
                                    });

                                }
                            } else {
                                console.error('cacheValidate must be a Function');
                            }
                        } catch (e) {
                            console.error(e);
                        }
                        if (realsuccess) realsuccess(data);
                    };

                }

            } catch (e) {
                console.error(e);
            }
        } else {
            return;
        }
    });

    /**
     * This function performs the fetch from cache portion of the functionality needed to cache ajax
     * calls and still fulfill the jqXHR Deferred Promise interface.
     * See also $.ajaxPrefilter
     * @method $.ajaxTransport
     * @params options {Object} Options for the ajax call, modified with ajax standard settings
     */
    $.ajaxTransport("+*", function(options, originalOptions, jqXHR) {
        let cacheProxy = $ajaxCache.getCacheProxy();
        let ajaxCacheOptions = options.ajaxCache;

        if (ajaxCacheOptions) {
            var storage = cacheProxy.getStorage(ajaxCacheOptions.storageType);

            if (!storage.isSupported()) {
                return;
            }

            var cacheKey = cacheProxy.genCacheKey(options, originalOptions, ajaxCacheOptions.preGenCacheKey),
                value = storage.get(cacheKey);

            if (value && ajaxCacheOptions.forceRefresh !== true) {
                console.info('read from $ajaxCache:', value);
                return {
                    send: function(headers, completeCallback) {
                        LZUTF8.decompressAsync(input, {
                            inputEncoding: "BinaryString",
                            outputEncoding: "String"
                        }, function(result, error) {
                            if (error === undefined) {
                                console.log("Data successfully decompressed to " + result.length + " UTF-8 bytes");
                                var response = {};
                                response['json'] = JSON.parse(result);
                                completeCallback(200, 'success', response, '');
                            } else
                                console.log("Decompression error: " + error.message);
                        });

                    },
                    abort: function() {
                        console.log("Aborted ajax transport for json cache.");
                    }
                };
            }
        }
    });
}

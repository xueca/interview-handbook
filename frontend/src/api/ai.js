import request from './request'

export function generate(params){
    return request.post('/ai/generate',params)
}

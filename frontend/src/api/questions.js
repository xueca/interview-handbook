import request from './request'


export function getList(params){
    return request.get('/questions',{params})

}
export function getDetail(id){
    return request.get(`/questions/${id}`)
    
}
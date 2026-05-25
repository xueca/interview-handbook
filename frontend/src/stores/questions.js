import  {defineStore} from 'pinia'
import { ref } from 'vue'
import {getList,getDetail} from '../api/questions'

export const useQuestionsStore = defineStore('questions',()=>
{
    // state：存 questionsList 和 questionDetail
    const list = ref([])
    const currentDetail = ref(null)
    const loading = ref(false)
    //actions
    async function fetchlist(params){
        loading.value = true
        const res = await getList(params)
        if (res.code === 0) {
            list.value = res.data
        }
        loading.value = false
    }
    async function fetchDetail(id){
        loading.value = true
        const res = await getDetail(id)
        if (res.code === 0) {
            currentDetail.value = res.data
        }
        loading.value = false
        return res
    }
    return {list,currentDetail,loading,fetchlist,fetchDetail}
})
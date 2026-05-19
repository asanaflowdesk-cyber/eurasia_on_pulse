export const state = {
  sb:null, user:null, profile:null,
  posts:[], profiles:[], tags:[], dicts:[], materials:[], logs:[],
  activeTab:'plan', selectedPost:null, selectedUser:null, selectedMaterial:null, selectedDict:null, selectedTag:null, dictCategory:'block',
  dirty:new Set(), filters:{week:'all',block:'all',status:'all',q:''}, calDate:new Date(), drawerDate:null, excelPage:1
};

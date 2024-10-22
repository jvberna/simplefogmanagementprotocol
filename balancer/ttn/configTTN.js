
// Topic Y
mqttQue='mqtt://eu1.cloud.thethings.network:1883'

// Aplicación ua-sensors
appID='ua-sensor@ttn'
accessKey='NNSXS.DW6H24ZTLSETUA5N7HICXA5OIRAES2QD4LLLM3Y.34Y7EB3XRAO2E3VMB74S4TDAWJBERR3SAISINSRU2UIRDBEW52IQ'

// suscribe es un array de colas a las que se suscribe el usuario
suscribe=['v3/'+appID+'/devices/+/up']

module.exports = {
    appID,
    accessKey,
    suscribe, 
    mqttQue
}
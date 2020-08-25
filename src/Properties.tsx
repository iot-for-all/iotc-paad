
import React, { useContext, useState, useEffect } from 'react';
import { View, Platform, FlatList, Alert } from 'react-native';
import { IIcon, useScreenIcon } from './hooks/common';
import { IoTCContext, CentralClient } from './contexts/iotc';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card } from './components/card';
import { useSimulation, useIoTCentralClient } from './hooks/iotc';
import { Loader } from './components/loader';
import { useTheme } from '@react-navigation/native';
import Registration from './Registration';
import { useScreenDimensions } from './hooks/layout';
import { IOTC_EVENTS, IIoTCProperty, IoTCClient } from 'react-native-azure-iotcentral-client';
import { StateUpdater, valueof } from './types';
import { getDeviceInfo } from './properties/deviceInfo';
import { Headline, Text } from './components/typography';
import { Overlay } from 'react-native-elements';

export const PROPERTY_CHANGED = 'PROPERTY_CHANGED';

type PropertiesProps = {
    id: string,
    name: string,
    editable: boolean,
    value?: any
}

const AVAILABLE_PROPERTIES = {
    WRITEABLE_PROP: 'writeableProp',
    READONLY_PROP: 'readOnlyProp'
}

const propsMap: { [id in valueof<typeof AVAILABLE_PROPERTIES>]: PropertiesProps } = {
    [AVAILABLE_PROPERTIES.WRITEABLE_PROP]: {
        id: AVAILABLE_PROPERTIES.WRITEABLE_PROP,
        name: 'WriteableProp',
        editable: false
    },
    [AVAILABLE_PROPERTIES.READONLY_PROP]: {
        id: AVAILABLE_PROPERTIES.READONLY_PROP,
        name: 'ReadOnlyProp',
        value: 'readonly',
        editable: true
    }
}

async function onPropUpdate(update: StateUpdater<PropertiesProps[]>, prop: IIoTCProperty) {
    update(current => (current.map(({ ...property }) => {
        if (property.id === prop.name) {
            property.value = prop.value;
        }
        return property;
    })));
    await prop.ack();
}

async function initProps(client: CentralClient, properties: PropertiesProps[]) {
    if (client && client.isConnected()) {
        await client.sendProperty(await getDeviceInfo());
        properties.forEach(async prop => {
            if (prop.value) {
                await client.sendProperty({ [prop.id]: prop.value });
            }
        });
    }
}

export default function Properties() {
    useScreenIcon(Platform.select({
        ios: {
            name: 'create-outline',
            type: 'ionicon'
        },
        android: {
            name: 'playlist-edit',
            type: 'material-community'
        }
    }) as IIcon);

    // const [simulated] = useSimulation();
    const [client] = useIoTCentralClient();
    const insets = useSafeAreaInsets();
    const { screen } = useScreenDimensions();
    const [simulated] = useSimulation();
    const [data, setData] = useState<PropertiesProps[]>(Object.values(propsMap));
    const { colors } = useTheme();
    const [showAlert, setShowAlert] = useState(false);
    const [alertMsg, setAlertMsg] = useState('');


    useEffect(() => {
        if (client && client.isConnected()) {
            client.on(IOTC_EVENTS.Properties, onPropUpdate.bind(null, setData));
            initProps(client, data);
            client.fetchTwin();
        }
    }, [client]);



    if (simulated) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', marginHorizontal: 30 }}>
                <Headline style={{ textAlign: 'center' }}>Simulation mode is enabled</Headline>
                <Text style={{ textAlign: 'center' }}> Properties are not available.
                Disable simulation mode and connect to IoT Central to work with properties.
                </Text>
            </View>
        )
    }
    if (client === null) {
        return <Registration />
    }

    if (client === undefined) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', height: screen.height / 4, padding: 20 }}>
                <Loader message={'Connecting to IoT Central ...'} />
            </View>)
    }

    return (<View style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom }}>

        <FlatList numColumns={1} data={data} renderItem={(item) => {
            let val = item.item.value;
            // if (val && val.x && val.y && val.z) {
            //     val = Object.values(val).map((v: number) => Math.round(v * 100) / 100).join(',');
            // }
            return <Card title={item.item.name} value={val}
                enabled
                editable={item.item.editable}
                onEdit={async (value) => {
                    try {
                        await client.sendProperty({ [item.item.id]: value });
                        Alert.alert('Property', `Property ${item.item.name} successfully sent to IoT Central`, [{ text: 'OK' }]);
                    }
                    catch (e) {
                        Alert.alert('Property', `Property ${item.item.name} not sent to IoT Central`, [{ text: 'OK' }]);
                    }
                }}
                onToggle={() => { }}
            />
        }} keyExtractor={(item, index) => `prop-${index}`} />
        <Overlay isVisible={showAlert} onBackdropPress={() => setShowAlert(false)}>
            <Text>{alertMsg}</Text>
        </Overlay>
    </View >)
    // return (<View></View>)

}
import React, { useContext, useEffect, useState } from 'react';
import { View, Platform } from 'react-native';
import { IIcon, useScreenIcon } from './hooks/common';
import { useSimulation, useIoTCentralClient, useTelemetry } from './hooks/iotc';
import Registration from './Registration';
import { Text, Headline } from './components/typography';
import { IoTCContext, SensorProps } from './contexts/iotc';
import { Loader } from './components/loader';
import { ScrollView } from 'react-native-gesture-handler';
import { useScreenDimensions } from './hooks/layout';
import { IOTC_EVENTS, IIoTCCommand, IIoTCCommandResponse } from 'react-native-azure-iotcentral-client';
import { LogItem, LOG_DATA, StateUpdater, TimedLog } from './types';
import { colors } from 'react-native-elements';
import { useTheme } from '@react-navigation/native';


type CommandInfo = { timestamp: number, cmd: IIoTCCommand }[];

const ENABLE_DISABLE_COMMAND = 'enableSensors';
const SET_FREQUENCY_COMMAND = 'changeInterval';


const onCommandUpdate = async function (setTelemetry: (id: string, data: Partial<SensorProps>) => void, setLogs: StateUpdater<TimedLog>, command: IIoTCCommand) {
    let data: any;
    data = JSON.parse(command.requestPayload);

    if (command.name === ENABLE_DISABLE_COMMAND) {
        if (data.sensor) {
            setTelemetry(data.sensor, { enabled: data.enable ? data.enable : false });
            await command.reply(IIoTCCommandResponse.SUCCESS, 'Enable');
        }
    }
    else if (command.name === SET_FREQUENCY_COMMAND) {
        if (data.sensor) {
            setTelemetry(data.sensor, { interval: data.frequency ? data.frequency * 1000 : 5000 });
            await command.reply(IIoTCCommandResponse.SUCCESS, 'Frequency');
        }
    }
    setLogs(current => ([...current, { timestamp: Date.now(), logItem: { eventName: command.name, eventData: command.requestPayload } }]));

}


export default function Logs() {
    const { screen } = useScreenDimensions();
    useScreenIcon(Platform.select({
        ios: {
            name: 'console',
            type: 'material-community'
        },
        android: {
            name: 'console',
            type: 'material-community'
        }
    }) as IIcon);

    const { colors } = useTheme();
    const [simulated] = useSimulation();
    const { addListener, removeListener } = useContext(IoTCContext);
    const [client] = useIoTCentralClient();
    const { set } = useTelemetry();
    const [logs, setLogs] = useState<TimedLog>([]);

    const updateLogs = (logItem: LogItem) => setLogs(current => ([...current, { logItem, timestamp: new Date(Date.now()).toLocaleString() }]))
    useEffect(() => {
        addListener(LOG_DATA, updateLogs);
        if (client && client.isConnected()) {
            client.on(IOTC_EVENTS.Commands, onCommandUpdate.bind(null, set, setLogs));
            client.fetchTwin();
        }
        return () => { removeListener(LOG_DATA, updateLogs) };
    }, [client]);

    // if (simulated) {
    //     return (
    //         <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', marginHorizontal: 30 }}>
    //             <Headline style={{ textAlign: 'center' }}>Simulation mode is enabled</Headline>
    //             <Text style={{ textAlign: 'center' }}> Logs are not available.
    //             Disable simulation mode and connect to IoT Central to work with commands.
    //             </Text>
    //         </View>
    //     )
    // }
    // if (client === null) {
    //     return <Registration />
    // }

    // if (client === undefined) {
    //     return (
    //         <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', height: screen.height / 4, padding: 20 }}>
    //             <Loader message={'Connecting to IoT Central ...'} />
    //         </View>)
    // }
    return (<View style={{ flex: 1, padding: 10 }}>
        <Text>Received commands will be logged below.</Text>
        <ScrollView style={{ margin: 10, borderWidth: 1, borderColor: colors.border, padding: 10 }}>
            {logs.map((l, i) => (
                <React.Fragment key={`logf-${i}`}>
                    <Text key={`log-${i}`}>{l.timestamp}:
                    <Text key={`logdata-${i}`} style={{ color: 'green' }}>{l.logItem.eventName}</Text>
                    </Text>
                    <Text key={`logpayload-${i}`}>{l.logItem.eventData}</Text>
                </React.Fragment>
            ))}
        </ScrollView>
    </View>)
}
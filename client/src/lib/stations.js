//@lee-hlmilk > an existing record may keep its inactive station > avoid duplicating a station already supplied
export function withCurrentStation(stations, current) {
    return current?.id && !stations.some(station => station.id === current.id) ? [current, ...stations] : stations;
}

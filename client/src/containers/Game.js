import React, {Component} from 'react'
import {inject, observer, Provider} from "mobx-react"
import "../style/form.css";
import {Col, Row, Alert} from 'reactstrap';
import 'bootstrap/dist/css/bootstrap.css';
import 'font-awesome/css/font-awesome.min.css';
import io from 'socket.io-client';

import TimerExample from './timer'
import LeftSideBar from './LeftSideBar';
import {Drawer} from "./Drawer";
import {Guesser} from './Guesser';
import ResultModal from './ResultModal';

// inspired by source code from lecture 2 HTML5
class Game extends Component {
    constructor(props) {
        super(props)
        this.socket = io.connect("/");
        this.state = {
            begun: false,
            newRound: false,
            userType: "",
            game: "",
            curPlayer: "",
            rounds: 0,
            over: false
        };
    }

    componentWillUnmount() {
      this.socket.disconnect();
    }

    componentDidMount() {
      this.props.lobbyStore.getRoom(this.props.match.params.id).catch((room) => {
        this.props.history.replace("/lobby");
        return null;
      });

      var self = this;

        this
            .socket
            .on('connect', () => {
                this
                    .socket
                    .emit('authenticate', {token: this.props.userStore.token}) //send the jwt
                    .on('authenticated', () => {
                      this
                          .fetchGame()
                          .then((values) => {
                              if (values[1].players.find((e) => e.username === values[0].username).length === 0) {
                                  self.props.history.replace("/lobby");
                                  return null;
                              }
                              this.setState({rounds: values[1].roundsPlayed, begun: values[1].started, curPlayer: values[0], game: values[1]});
                              if (values[0].username === values[1].drawer.username) {
                                  this.setState({userType: "draw"});
                              } else {
                                  this.setState({userType: "guess"});
                              }
                              this
                                  .props
                                  .gameStore
                                  .updateState(JSON.stringify(values[1].gameState));
                              this
                                  .props
                                  .gameStore
                                  .setPaint(false);
                              this
                                  .socket
                                  .emit('join', values);
                              this.roundStarted();
                              this.roundEnded();
                              this.newUser();
                              this.gameOver();
                          }).catch(() => {
                            self.props.history.replace("/lobby");
                            return null;
                          })
                    })
                    .on("unauthorized", function (error, callback) {
                        self.props.history.replace("/lobby");
                        return null;
                    });
            });
    }

    roundStarted = () => {
        this
            .socket
            .on('startRound', (game) => {
                alert("GOING TO START ROUND");
                this.setState({
                    rounds: this.state.rounds + 1,
                    begun: true,
                    newRound: false
                });
            })
    }

    fetchGame() {
        return (Promise.all([
            this
                .props
                .userStore
                .pullUser(),
            this
                .props
                .lobbyStore
                .getRoom(this.props.match.params.id)
        ]))
    }

    updateGame() {
        this
            .fetchGame()
            .then((values) => {
                this.setState({curPlayer: values[0], game: values[1]});
            })
    }

    newUser = () => {
        this
            .socket
            .on('newUser', (game) => {
                this.updateGame();

            })
    }

    gameOver = () => {
        this
            .socket
            .on('gameOver', (game) => {
                this.setState({over: true, game: game})
            })

    }

    roundEnded = () => {
        this
            .socket
            .on('roundEnd', (game) => {
                this
                    .props
                    .gameStore
                    .reset();
                this.setState({game: game, begun: false, newRound: true});
                const store = this.props.gameStore;
                const gameState = {
                    xPos: store.getX,
                    yPos: store.getY,
                    color: store.getColor,
                    width: store.getPenWidth,
                    curWidth: store.getWidth,
                    curColor: store.getCurColor,
                    isPainting: store.Paint,
                    dragging: store.getDrag
                }
                this
                    .socket
                    .emit('gameState', JSON.stringify({id: this.state.game.id, game: gameState}));
            })
    }
    render() {
        /* render something here if over is true then redirect to lobby

        */
        var timer = null
        var roundAlert = null;
        var modal = null;
        if (this.state.over) {
            modal = <ResultModal players={this.state.game.players} history={this.props.history} viewResultModal={true}/>
        }
        if (this.state.begun) {
            timer = <Row>
                <Col>
                    <TimerExample game={this.state.game} socket={this.socket} start={Date.now()}/>
                </Col>
            </Row>
        }
        if (this.state.newRound) {
            roundAlert = <Alert color="warning">
                NEW ROUND STARTING SOON
            </Alert>
            setTimeout(() => {
                window
                    .location
                    .reload();
            }, 3000);
        }
        var userType = null;
        if (this.state.userType === 'draw') {
            userType = <Drawer
                game={this.state.game}
                user={this.state.curPlayer}
                socket={this.socket}/>
        }
        if (this.state.userType === 'guess') {
            userType = <Guesser
                game={this.state.game}
                user={this.state.curPlayer}
                socket={this.socket}/>
        }
        return (
            <div>
                {roundAlert}
                {modal}
                ROUND {this.state.rounds + ":  "}{timer}
                <Provider store={this.props.gameStore}>
                    <Row>
                        <LeftSideBar game={this.state.game} socket={this.socket} />
                        <div
                            style={{
                            marginLeft: "40px"
                        }}>{userType}
                        </div>
                    </Row>
                </Provider>
            </div>
        )
    }
}

export default Game = inject('userStore', 'lobbyStore', 'gameStore')(observer(Game))

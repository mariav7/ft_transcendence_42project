export const initGameTwoD = (data) => {

    const { user_paddle_1, user_paddle_2 } = data;
    const { ball_game } = data;

    const ball = createBall('ball', ball_game);
    const paddle_1 = createPaddle('user', user_paddle_1);
    const paddle_2 = createPaddle('user', user_paddle_2);

    const board_game = document.getElementById('board-game');

    const waiting_message = document.getElementById('waiting-message');
    if (waiting_message) {
        board_game.removeChild(waiting_message);
    }
    const message = document.getElementById('seconds');
    const msg = document.getElementById('countdown');
    if (message) {
        board_game.removeChild(message);
    }
    if (msg) {
        board_game.removeChild(msg);
    }
	board_game.appendChild(ball);
	board_game.appendChild(paddle_1);
    board_game.appendChild(paddle_2);
}

const createPaddle = ( className, user ) => {
    // //console.log('createPaddle call()');
    const paddle = document.createElement('div');
    paddle.setAttribute('id', `paddle-${user.id}`);
    /*Setting element class name*/
    paddle.className = `${className}-paddle`;
    /*Getting size for data user*/
    const { size_x , size_y} = user;
    const width = 100 * size_x;
    const height = 100 * size_y
    /*Setting size with calc()*/
    paddle.style.setProperty("width", `calc(${width}%)`);
    paddle.style.setProperty("height", `calc(${height}%)`);
    const { top, left } = user;
    paddle.style.setProperty("top", `calc(${top * 100}%)`);
    paddle.style.setProperty("left", `calc(${left * 100}%)`);
    return (paddle);
};

const createBall = ( id, ball_data ) => {
    // //console.log('createBall call()');
    /*Setting id for ball */
	const ball = document.createElement('div');
    ball.setAttribute('id', id);
    /*Setting width and height*/
    const { size_x , size_y} = ball_data;
    /*Setting size with calc()*/
    ball.style.setProperty("width", `calc(${size_x* 100}%)`);
    ball.style.setProperty("height", `calc(${size_y * 100}%)`);
    /*Setting position */
    const { top, left }  = ball_data;
    ball.style.setProperty("top", `calc(${top * 100}%)`);
    ball.style.setProperty("left", `calc(${left * 100}%)`);
    /*Adding ball effect*/
    const ballEffect = document.createElement('div');
    ballEffect.className = 'ball_effect';
    ball.appendChild(ballEffect);
    return (ball);
};

export const drawGameElements = (game_state_info) => {
    const { user_paddle_1, user_paddle_2 } = game_state_info;
    const { ball_game } = game_state_info;
    drawBall(ball_game);
    drawUserPaddle(user_paddle_1);
    drawUserPaddle(user_paddle_2);
    drawScoreUser(user_paddle_1);
    drawScoreUser(user_paddle_2);
}

const drawBall = (ball_info) => {
    const ball = document.getElementById('ball');
    if (!ball)
        return;
    const top = 100 * ball_info.top;
    const left = 100 * ball_info.left
    ball.style.setProperty("top", `calc(${top}%)`);
    ball.style.setProperty("left", `calc(${left}%)`);
}

const drawUserPaddle = (paddle_user_info) => {
    const paddle = document.getElementById(`paddle-${paddle_user_info.id}`);
    if (!paddle)
        return;
    const top = 100 * paddle_user_info.top;
    if (paddle_user_info.id == 1)
        paddle.style.backgroundColor = '#FF003D';
    else
        paddle.style.backgroundColor = '#FCFF76';
    paddle.style.setProperty("top", `calc(${top}%)`);
}

const drawScoreUser = (user_info) => {
    const score = document.getElementById(`score-${user_info.id}`);
    if (!score)
        return;
    score.innerHTML = `${user_info.score}`;
}

export const drawUser = (user_info) => {
    const user = document.createElement('div');
    if (!user)
        return;
    user.className = 'game_user';
    const top = 100 * user_info.top;
    const left = 100 * user_info.left
    user.style.setProperty("top", `calc(${top}%)`);
    user.style.setProperty("left", `calc(${left}%)`);
}

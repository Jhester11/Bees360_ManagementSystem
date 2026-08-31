<?php

it('redirects guests to the login page from the home route', function () {
    $response = $this->get('/');

    $response->assertRedirect('/login');
});

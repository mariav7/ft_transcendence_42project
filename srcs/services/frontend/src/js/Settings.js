import { BaseClass } from './BaseClass';

export class Settings extends BaseClass {
    constructor() {
        super();
        this.addDocumentClickListener();
        this.token = localStorage.getItem('token');
        this.userData;
    }

    async getUserData() {
        try {
            const response = await fetch(`${this.httpProtocol}://${this.host}:${this.backendPort}/users/profile/`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                if (response.status === 401) {
                    console.error('Unauthorized access. Please log in.');
                } else {
                    console.error('Error:', response.status);
                }
                throw new Error('Unauthorized');
            }
            const data = await response.json();
            this.userData = data;
            return data;
        } catch (error) {
            console.error('Error:', error);
            throw error;
        }
    }

    async handleDocumentClick(event) {
        this.editButton = document.getElementById('editButton');
        this.switchCheck = document.getElementById('twoFA_switch')
        if (event.target.id === 'editButton' && this.editButton && this.editButton.disabled == false) {
            event.preventDefault();
            await this.handleButtonClick(event);
        }
        else if (event.target.id == 'twoFA_switch'){
            this.isChecked = (this.switchCheck.checked) ? true : false;
        
        }
    }

    removeEventListeners() {
        document.removeEventListener('click', this.boundHandleDocumentClick);
    }

    async enableTwoFa(){
        const res =  await fetch(`${this.httpProtocol}://${this.host}:${this.backendPort}/users/otp/`, { 
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json',
        },

        });
        if (!res.ok)
        {
            console.error("ERROR POSTING OTP");
        }
        else {
            await this.getUserData();
            document.getElementById('app').innerHTML += `<br>
            <p class="text-center">Please scan the QR code with Google authenticator:</p>
            <p class="text-center">Disclaimer : This is your only chance to scan it!</p>
            <div class="container">
                <div class="row align-items-center">
                    <div class="row justify-content-center align-items-center">
                        <img src="${this.userData.qr_code}" id="qrCode" alt="QR CODE">
                    </div>
                </div>
            </div>`;
        }
    }

    hideMessage(id) {
        const alertElement = document.getElementById("redWarning");
        if (!alertElement)
            return;
        alertElement.textContent = '';
        alertElement.style.display = 'none';
    }

    displayMessage(message, flag) {
        const id = (flag) ? ".alert-success" : ".alert-danger";
        const alertElement = document.getElementById("redWarning");
        alertElement.textContent = message;
        alertElement.style.display = 'block';
        setTimeout(() => {
            this.hideMessage(id);
        }, 1500);
    }

    async handleButtonClick(event) {
        const username = document.getElementById('newusername').value;
        const email = document.getElementById('newemail').value;
        const bio = document.getElementById('newbio').value;
        const profile_pic = document.getElementById('newavatar');
    
        // Check if any field has been modified
        const isModified = username.trim() !== '' || email.trim() !== '' || bio.trim() !== '' || this.isChecked != null || (profile_pic.files && profile_pic.files.length > 0);
        if (!isModified) {
            this.displayMessage("No changes detected. Form not submitted", false);
            return;
        }

        // Prepare data object for JSON
        const jsonData = {};
        if (username.trim() !== '') {
            jsonData.username = username.trim();
        }
        if (email.trim() !== '') {
            jsonData.email = email.trim();
        }
        if (bio.trim() !== '') {
            jsonData.bio = bio.trim();
        }
        if (this.isChecked != null)
            jsonData.otp_enabled = this.isChecked;
    
        const formData = new FormData();
        if (profile_pic.files && profile_pic.files.length > 0) {
            formData.append('profile_pic', profile_pic.files[0]);
            const fileName = profile_pic.files[0].name;
        }
        else
            //console.log('No file selected');
    
        // Merge JSON and file data into FormData
        for (const [key, value] of Object.entries(jsonData)) {
            formData.append(key, value);
        }
    
        try {
            const response = await fetch(`${this.httpProtocol}://${this.host}:${this.backendPort}/users/update_profile/${this.userData.id}/`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                },
                body: formData,
            });
    
            if (!response.ok) {
                const responseData = await response.text();
                const cleanedResponse = responseData.replace(/["'{}[\]]/g, '');
                this.displayMessage(cleanedResponse, false);
                throw new Error('Invalid submission');
            }
    
            const data = await response.json();
            //console.log(data);
            document.getElementById('app').innerHTML = "Profile successfully updated";
            if (this.isChecked === true && this.isChecked !== this.formerState && this.userData.otp_enabled === false) {
                await this.enableTwoFa();
            }
        } catch (error) {
            console.error('Failed to update profile', error);
        }
    }
    
    async getHtmlForMain() {
        await this.getUserData();
        let switchValue = null;
        this.formerState = this.userData.otp_enabled;
        if (this.formerState == true)
            switchValue = "checked";
        
        return `<h1 class="mb-2">Edit profile</h1>
                <div class="form-group">
                    <form id="editprofile" enctype="multipart/form-data" class="text-start">
                        <div class="row my-3 justify-content-center">
                            <div class="col-xl-4 col-lg-6 col-md-8">
                                <label for="username">Username:</label>
                                <input class="form-control form-control-sm" type="text" id="newusername" name="username" placeholder="Enter username">
                            </div>
                        </div>
                        <div class="row my-3 justify-content-center">
                            <div class="col-xl-4 col-lg-6 col-md-8">
                                <label for="email">E-mail:</label>
                                <input class="form-control form-control-sm" type="email" id="newemail" name="email" placeholder="Enter e-mail">
                            </div>
                        </div>
                        <div class="row my-3 justify-content-center">
                            <div class="col-xl-4 col-lg-6 col-md-8">
                                <label for="password">Bio:</label>
                                <input class="form-control form-control-sm" type="text" id="newbio" name="bio" placeholder="Pizza is life">
                            </div>
                        </div>
                        <div class="row my-3 justify-content-center">
                            <div class="col-xl-4 col-lg-6 col-md-8">
                                <label for="formFile" class="form-label">Profile Pic:</label>
                                <input class="form-control" type="file" id="newavatar">
                            </div>
                        </div>
                        <div class="row my-3 justify-content-center align-items-center">
                            <div class="col-lg-4 col-md-8 form-group form-check form-switch text-start" id="twoFA">
                                <input class="m-1 form-check-input" type="checkbox" role="switch" id="twoFA_switch" ${switchValue}>
                                <label class="form-check-label" for="flexSwitchCheckDefault" id="twoFA_label"><p data-bs-toggle="tooltip" data-bs-placement="right" title="Enable / disable this to add an extra layer of security upon connection.">2FA <i class="bi bi-question-circle"></i></p></label>
                            </div>
                        </div>
                        <div class="row m-3 text-center justify-content-center">
                            <div class="col-xl-4 col-lg-6 col-md-8">
                                <button type="submit" id="editButton" class="py-1 px-2 btn btn-dark btn-sm">Submit</button>
                                <div id="redWarning" class="mt-3 alert alert-danger" role="alert" style="display :none;"></div>
                            </div>
                        </div>            
                    </form>
                </div>`
    }
}



